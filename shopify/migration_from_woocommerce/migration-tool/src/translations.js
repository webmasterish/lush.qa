// Arabic (secondary-locale) translations via translationsRegister (PRD §11).
// Each value needs the digest of the current original content, fetched from
// translatableResource — so this runs AFTER the EN load of the resource.

export async function ensureSecondaryLocales(ctx) {
  const { project, shopify, log } = ctx;
  const wanted = project.target.secondary_locales ?? [];
  if (!wanted.length) return;
  let data;
  try {
    data = await shopify.gql(`{ shopLocales { locale published } }`);
  } catch (e) {
    throw new Error(
      `Cannot read shop locales (${e.message}). The app token likely lacks read_locales/write_locales — add the scopes to the Dev Dashboard app, reinstall, and re-mint the offline token.`
    );
  }
  const have = new Map(data.shopLocales.map((l) => [l.locale, l]));
  for (const locale of wanted) {
    if (!have.has(locale)) {
      const res = await shopify.gql(
        `mutation ($locale: String!) { shopLocaleEnable(locale: $locale) { shopLocale { locale } userErrors { field message } } }`,
        { locale }
      );
      const errs = res.shopLocaleEnable?.userErrors;
      if (errs?.length) throw new Error(`shopLocaleEnable(${locale}): ${errs.map((e) => e.message).join("; ")}`);
      log("info", { action: "system", message: `Enabled shop locale '${locale}'.` });
    } else if (!have.get(locale).published) {
      log("warn", { action: "system", message: `Shop locale '${locale}' exists but is unpublished — publish it in Settings > Languages for the storefront to show it.` });
    }
  }
}

// Register the given key->value map as `locale` translations on a resource.
// Only keys that exist in the resource's translatableContent (with a digest)
// are sent. Returns the number of keys registered.
export async function registerTranslations(ctx, resourceId, locale, values) {
  const entries = Object.entries(values).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return 0;

  const data = await ctx.shopify.gql(
    `query ($id: ID!) { translatableResource(resourceId: $id) { translatableContent { key digest } } }`,
    { id: resourceId }
  );
  const digests = new Map(
    (data.translatableResource?.translatableContent ?? []).map((c) => [c.key, c.digest])
  );

  const translations = entries
    .filter(([key]) => digests.get(key))
    .map(([key, value]) => ({ key, value, locale, translatableContentDigest: digests.get(key) }));
  if (!translations.length) return 0;

  const res = await ctx.shopify.gql(
    `mutation ($id: ID!, $translations: [TranslationInput!]!) {
      translationsRegister(resourceId: $id, translations: $translations) {
        translations { key } userErrors { field message }
      }
    }`,
    { id: resourceId, translations }
  );
  const errs = res.translationsRegister?.userErrors;
  if (errs?.length) {
    throw Object.assign(new Error(errs.map((e) => `${e.field?.join(".") ?? ""}: ${e.message}`).join("; ")), {
      userErrors: errs,
    });
  }
  return res.translationsRegister.translations.length;
}
