// Replacing #mini-cart's innerHTML resets the drawer's scroll position;
// capture it before a section re-render and restore it right after.
const withMiniCartScrollRestore = (render) => {
  const main = document.querySelector('.mini-cart__main');
  const scrollTop = main ? main.scrollTop : 0;
  render();
  if (scrollTop > 0) {
    const newMain = document.querySelector('.mini-cart__main');
    if (newMain) newMain.scrollTop = scrollTop;
  }
};

// Surgical drawer update: instead of swapping #mini-cart's innerHTML
// wholesale (which closes the note/shipping/discount collapsibles, drops
// the upsell list state and re-creates every element), patch only the
// regions that money changes actually touch. Returns false whenever the
// structures don't line up — callers then fall back to the full swap.
window.theme = window.theme || {};
theme.patchMiniCart = (sectionInnerHTML) => {
  const live = document.getElementById('mini-cart');
  if (!live || !sectionInnerHTML) return false;

  // The section's inner HTML has form.mini-cart at its root (the #mini-cart
  // wrapper element lives in the header section, not in this section).
  const next = new DOMParser().parseFromString(sectionInnerHTML, 'text/html').body;
  if (!next) return false;

  const liveForm = live.querySelector('form.mini-cart');
  const nextForm = next.querySelector('form.mini-cart');
  if (!liveForm || !nextForm) return false;

  // Empty <-> filled flips change the whole layout — let the full swap run.
  if (liveForm.classList.contains('is-empty') !== nextForm.classList.contains('is-empty')) return false;

  const regions = [
    { selector: 'cart-items', mode: 'inner' },          // line items
    { selector: '.free-shipping', mode: 'outer' },      // progress bar + message
    { selector: '.taxes-discounts', mode: 'outer' },    // cart-level discounts + taxes note
    { selector: 'gift-wrapping', mode: 'outer' },       // checkbox state + data attributes
    { selector: 'cart-discount .discounts', mode: 'inner' }, // applied-code badges
    // the checkout form submits this field — leaving it stale would
    // re-apply a discount code the customer just removed
    { selector: 'input[type="hidden"][name="discount"]', mode: 'outer' },
    { selector: '#mini-cart-subtotal', mode: 'inner' }
  ];

  // Verify everything pairs up before touching the DOM (no partial patches).
  const jobs = [];
  for (const region of regions) {
    const liveEls = live.querySelectorAll(region.selector);
    const nextEls = next.querySelectorAll(region.selector);
    if (liveEls.length !== nextEls.length) return false;
    liveEls.forEach((el, i) => jobs.push({ el, nextEl: nextEls[i], mode: region.mode }));
  }

  // The main area scroll-snaps; restore its position after the mutations
  // so replacing the row list doesn't snap the view back to the top.
  const main = live.querySelector('.mini-cart__main');
  const scrollTop = main ? main.scrollTop : 0;

  jobs.forEach(({ el, nextEl, mode }) => {
    if (mode === 'inner') {
      el.innerHTML = nextEl.innerHTML;
    } else {
      el.outerHTML = nextEl.outerHTML;
    }
  });

  liveForm.className = nextForm.className;

  // The upsell block is anchored to the first cart item (product_id in its
  // data-url). Refresh it only when that anchor changed — a re-created
  // element re-observes and re-fetches; otherwise keep its loaded content.
  const liveRecs = live.querySelector('cart-recommendations');
  const nextRecs = next.querySelector('cart-recommendations');
  if (liveRecs && nextRecs && liveRecs.dataset.url !== nextRecs.dataset.url) {
    liveRecs.outerHTML = nextRecs.outerHTML;
  }

  live.querySelectorAll('.is-pending, .cart-item--pending').forEach((el) => {
    el.classList.remove('is-pending', 'cart-item--pending');
  });
  if (main && scrollTop > 0) main.scrollTop = scrollTop;

  return true;
};

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);
if (!customElements.get('cart-items')) {
  customElements.define('cart-items', class CartItems extends HTMLElement {
    cartUpdateUnsubscriber = undefined;
    
    constructor() {
      super();

      this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');
      this.cartErrors = document.getElementById('cart-errors');

      this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
        .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

      this.debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, 300);

      this.addEventListener('change', this.debouncedOnChange.bind(this));
      this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
    }

    disconnectedCallback() {
      if (this.cartUpdateUnsubscriber) {
        this.cartUpdateUnsubscriber();
      }
    }

    onCartUpdate(event) {
      const sections = event.sections;
      const parsedState = event.cart;

      // A newer quantity request is already in flight — let its response
      // drive the DOM instead of this stale one.
      if (event.source === 'cart-items' && event.seq !== undefined && event.seq !== this.updateSeq) return;

      this.classList.toggle('is-empty', parsedState.item_count === 0);
      const cartFooter = document.getElementById('main-cart-footer');

      if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
      if (parsedState.errors) {
        this.updateErrorLiveRegions(event.line, parsedState.errors);
      }

      // In the drawer, patch only the money-touched regions; fall back to
      // the full section swap when the structures don't line up (or on the
      // cart page, which renders different sections).
      const inDrawer = !!this.closest('#mini-cart');
      const patched = inDrawer
        && parsedState.sections
        && parsedState.sections['mini-cart']
        && theme.patchMiniCart
        && theme.patchMiniCart(this.getSectionInnerHTML(parsedState.sections['mini-cart'], '.shopify-section'));

      withMiniCartScrollRestore(() => {
        this.getSectionsToRender().forEach((section => {
          if (patched && section.id === 'mini-cart') return;
          const element = document.getElementById(section.id);

          if (element) {
            const elementToReplace = element.querySelector(section.selector) || element;
            if (elementToReplace && parsedState.sections[section.section]) {
              elementToReplace.innerHTML =
                this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
            }
          }
        }));
      });

      this.updateQuantityLiveRegions(event.line, parsedState.item_count);

      const lineItem = document.getElementById(`CartItem-${event.line}`);
      if (lineItem && event.name) lineItem.querySelector(`[name="${event.name}"]`).focus();
      this.disableLoading();

      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          cart: parsedState
        }
      }));
    }

    // Instantly reflects a quantity change while the request is in flight.
    // The totals ALWAYS dim as in-flight feedback; the optimistic figure is
    // only written when client math is guaranteed right (no cart-level
    // discounts, price data present) — the server patch corrects/undims
    // ~0.5s later either way.
    optimisticSubtotal(line, quantity) {
      const miniCart = document.getElementById('mini-cart');
      if (!miniCart || !miniCart.contains(this)) return;

      const rows = Array.from(this.querySelectorAll('.mini-cart__navigation > li'));
      const changedRow = rows[parseInt(line) - 1];
      if (parseInt(quantity) === 0 && changedRow) changedRow.classList.add('cart-item--removing');

      const subtotals = miniCart.querySelectorAll('#mini-cart-subtotal');
      subtotals.forEach((el) => el.classList.add('is-pending'));

      if (!window.theme || !theme.Currency || !theme.shopSettings) return;
      if (parseInt(this.dataset.cartLevelDiscounts || '0') > 0) return;
      if (!rows.length || rows.some((row) => !row.dataset.finalPrice)) return;

      let total = 0;
      for (const [i, row] of rows.entries()) {
        let qty;
        if (i + 1 === parseInt(line)) {
          qty = parseInt(quantity);
        } else {
          const input = row.querySelector('.quantity__input');
          qty = input ? parseInt(input.value) : parseInt(row.dataset.quantity);
        }
        if (Number.isNaN(qty)) return;
        total += parseInt(row.dataset.finalPrice) * qty;
      }

      const format = theme.shopSettings.moneyWithCurrencyFormat || theme.shopSettings.moneyFormat;
      subtotals.forEach((el) => {
        el.innerHTML = theme.Currency.formatMoney(total, format);
      });
    }

    updateQuantity(line, quantity, name, target) {
      this.updateSeq = (this.updateSeq || 0) + 1;
      const seq = this.updateSeq;

      this.optimisticSubtotal(line, quantity);

      const sections = this.getSectionsToRender().map((section) => section.section);
      const body = JSON.stringify({
        line,
        quantity,
        sections: sections,
        sections_url: window.location.pathname
      });

      fetch(`${theme.routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cart: parsedState,  target, line, name, sections, seq });
        })
        .catch(() => {
          this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
          this.disableLoading();
          if (this.cartErrors) {
            this.cartErrors.textContent = theme.cartStrings.error;
          }
          this.resyncMiniCart();
        });
    }

    // The optimistic subtotal may be showing a number the server never
    // confirmed — pull a fresh render of the drawer section to re-sync.
    resyncMiniCart() {
      const miniCart = document.querySelector('mini-cart[data-url]');
      if (!miniCart || !miniCart.contains(this)) return;

      fetch(miniCart.dataset.url)
        .then((response) => response.text())
        .then((html) => {
          const sectionInnerHTML = new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector('.shopify-section').innerHTML;
          if (!theme.patchMiniCart || !theme.patchMiniCart(sectionInnerHTML)) {
            withMiniCartScrollRestore(() => {
              document.getElementById('mini-cart').innerHTML = sectionInnerHTML;
            });
          }
        })
        .catch((e) => console.error(e));
    }

    onChange(event) {
      if (event.target === null) return;
      this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
    }

    getSectionsToRender() {
      let sections = [
        {
          id: 'mini-cart',
          section: document.getElementById('mini-cart')?.id,
          selector: '.shopify-section',
        },
        {
          id: 'main-cart-items',
          section: document.getElementById('main-cart-items')?.dataset.id,
          selector: '.js-contents',
        },
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'mobile-cart-icon-bubble',
          section: 'mobile-cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'cart-live-region-text',
          section: 'cart-live-region-text',
          selector: '.shopify-section'
        },
        {
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.cart__footer',
        }
      ];
      if (document.querySelector('#main-cart-footer .free-shipping')) {
        sections.push({
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.free-shipping',
        });
      }
      return sections;
    }

    updateErrorLiveRegions(line, message) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
      if (lineItemError) lineItemError.querySelector('.cart-item__error-text').innerHTML = message;
    
      this.lineItemStatusElement.setAttribute('aria-hidden', true);
    
      const cartStatus =
        document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
      cartStatus.setAttribute('aria-hidden', false);
    
      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', true);
      }, 1000);
    }
    
    updateQuantityLiveRegions(line, itemCount) {
      if (this.currentItemCount === itemCount) {
        const quantityError = document.getElementById(`Line-item-error-${line}`);
        if (quantityError) {
          quantityError.querySelector('.cart-item__error-text')
            .innerHTML = theme.cartStrings.quantityError.replace(
              '[quantity]',
              document.getElementById(`Quantity-${line}`).value
            ); 
        }
      }

      this.currentItemCount = itemCount;
      
      if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);

      const cartStatus = document.getElementById('cart-live-region-text');
      if (cartStatus) {
        cartStatus.setAttribute('aria-hidden', false);

        setTimeout(() => {
          cartStatus.setAttribute('aria-hidden', true);
        }, 1e3);
      }
    }

    getSectionInnerHTML(html, selector) {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector)?.innerHTML;
    }

    enableLoading(line) {
      const cartItems = document.getElementById('main-cart-items');
      if (cartItems) cartItems.classList.add('cart__items--disabled');

      const loadingOverlay = this.querySelectorAll('.loading-overlay')[line - 1];
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      
      document.activeElement.blur();
      if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', false);
    }

    disableLoading() {
      const cartItems = document.getElementById('main-cart-items');
      if (cartItems) cartItems.classList.remove('cart__items--disabled');
    }

    renderContents(parsedState) {
      withMiniCartScrollRestore(() => {
        this.getSectionsToRender().forEach((section => {
          const element = document.getElementById(section.id);

          if (element) {
            element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
          }
        }));
      });
    }
  });
}

class CartNote extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('change', debounce((event) => {
      const body = JSON.stringify({ note: event.target.value });
      fetch(`${theme.routes.cart_update_url}`, {...fetchConfig(), ...{ body }});
    }, 300));
  }
}
customElements.define('cart-note', CartNote);

if (!customElements.get('cart-discount')) {
  customElements.define('cart-discount', class CartDiscount extends HTMLElement {
    constructor() {
      super();
      this.onApplyDiscount = this.applyDiscount.bind(this);
    }

    get sectionId() {
      return this.getAttribute('data-section-id');
    }
    
    connectedCallback() {
      this.submitButton = this.querySelector('[data-discount-btn]');
      this.resultsElement = this.lastElementChild;
      this.submitButton.addEventListener('click', this.onApplyDiscount);
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.submitButton.removeEventListener('click', this.onApplyDiscount);
    }

    getSectionsToRender() {
      let sections = [
        {
          id: 'mini-cart',
          section: document.getElementById('mini-cart')?.id,
          selector: '.shopify-section',
        },
        {
          id: 'main-cart-items',
          section: document.getElementById('main-cart-items')?.dataset.id,
          selector: '.js-contents',
        },
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'mobile-cart-icon-bubble',
          section: 'mobile-cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'cart-live-region-text',
          section: 'cart-live-region-text',
          selector: '.shopify-section'
        },
        {
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.cart__footer',
        }
      ];
      if (document.querySelector('#main-cart-footer .free-shipping')) {
        sections.push({
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.free-shipping',
        });
      }
      return sections;
    }

    applyDiscount(event) {
      event.preventDefault();

      const discountCode = this.querySelector('[name="discount"]');
      if (!(discountCode instanceof HTMLInputElement) || typeof this.getAttribute('data-section-id') !== 'string') return;

      this.abortController?.abort();
      this.abortController = new AbortController();

      const discountCodeValue = discountCode.value.trim();
      if (discountCodeValue === '') return;

      const existingDiscounts = this.existingDiscounts();
      if (existingDiscounts.includes(discountCodeValue)) return;

      this.setDiscountError('');
      this.submitButton.setAttribute('aria-busy', 'true');
      
      const sections = this.getSectionsToRender().map((section) => section.section);
      const body = JSON.stringify({
        discount: [...existingDiscounts, discountCodeValue].join(','),
        sections: sections,
        sections_url: window.location.pathname
      });

      fetch(`${theme.routes.cart_update_url}`, {...fetchConfig('json'), ...{ body }, signal: this.abortController.signal })
        .then((response) => response.json())
        .then((parsedState) => {
          if (
            parsedState.discount_codes.find((discount) => {
              return discount.code === discountCodeValue && discount.applicable === false;
            })
          ) {
            discountCode.value = '';
            this.setDiscountError(theme.discountStrings.error);
            return;
          }
          
          const newHtml = parsedState.sections[this.sectionId];
          const parsedHtml = new DOMParser().parseFromString(newHtml, 'text/html');
          const section = parsedHtml.getElementById(`shopify-section-${this.sectionId}`);

          if (section) {
            const discountCodes = section?.querySelectorAll('button[is="discount-remove"]') || [];
            const codes = Array.from(discountCodes)
              .map((element) => (element instanceof HTMLButtonElement ? element.getAttribute('data-discount') : null))
              .filter(Boolean);

            if (
              codes.length === existingDiscounts.length &&
              codes.every((code) => existingDiscounts.includes(code)) &&
              parsedState.discount_codes.find((discount) => {
                return discount.code === discountCodeValue && discount.applicable === true;
              })
            ) {
              discountCode.value = '';
              this.setDiscountError(theme.discountStrings.shippingError);
              return;
            }
          }

          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cart: parsedState });
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted by user');
          }
          else {
            console.error(error);
          }
        })
        .finally(() => {
          this.submitButton.removeAttribute('aria-busy');
        });
    }

    removeDiscount(event) {
      if ((event instanceof KeyboardEvent && event.key !== 'Enter') || !(event instanceof MouseEvent)) {
        return;
      }

      const discountCode = event.currentTarget.getAttribute('data-discount');
      
      if (!discountCode) return;

      const existingDiscounts = this.existingDiscounts();
      const index = existingDiscounts.indexOf(discountCode);
      if (index === -1) return;

      existingDiscounts.splice(index, 1);

      this.abortController?.abort();
      this.abortController = new AbortController();

      this.setDiscountError('');
      event.currentTarget.setAttribute('loading', '');

      const sections = this.getSectionsToRender().map((section) => section.section);
      const body = JSON.stringify({
        discount: existingDiscounts.join(','),
        sections: sections,
        sections_url: window.location.pathname
      });
      
      fetch(theme.routes.cart_update_url, { ...fetchConfig(), ...{ body }, signal: this.abortController.signal })
        .then((response) => response.json())
        .then((parsedState) => {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cart: parsedState });
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted by user');
          }
          else {
            console.error(error);
          }
        })
        .finally(() => {
          event.target.removeAttribute('loading');
        });
    }

    existingDiscounts() {
      const discountCodes = [];
      const discountPills = this.querySelectorAll('button[is="discount-remove"]');
      for (const pill of discountPills) {
        if (pill.hasAttribute('data-discount')) {
          discountCodes.push(pill.getAttribute('data-discount'));
        }
      }
      return discountCodes;
    }

    setDiscountError(error) {
      this.resultsElement.lastElementChild.textContent = error;
      if(error.length === 0) {
        this.resultsElement.classList.add('hidden');
      } else {
        this.resultsElement.classList.remove('hidden');
      }
    }
  });
}

class DiscountRemove extends HTMLButtonElement {
  constructor() {
    super();
     this.addEventListener('click', (event) => {
        const cartDiscount = this.closest('cart-discount') || document.querySelector('cart-discount');
        if (cartDiscount) {
          event.preventDefault();
          cartDiscount.removeDiscount(event);
        }
      });
  }
}
customElements.define('discount-remove', DiscountRemove, { extends: 'button' });

class ShippingCalculator extends HTMLElement {
  constructor() {
    super();

    this.setupCountries();
    
    this.errors = this.querySelector('#ShippingCalculatorErrors');
    this.success = this.querySelector('#ShippingCalculatorSuccess');
    this.zip = this.querySelector('#ShippingCalculatorZip');
    this.country = this.querySelector('#ShippingCalculatorCountry');
    this.province = this.querySelector('#ShippingCalculatorProvince');
    this.button = this.querySelector('button');
    this.button.addEventListener('click', this.onSubmitHandler.bind(this));
  }

  setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector('ShippingCalculatorCountry', 'ShippingCalculatorProvince', {
        hideElement: 'ShippingCalculatorProvinceContainer'
      });
    }
  }

  onSubmitHandler(event) {
    event.preventDefault();
    
    this.errors.classList.add('hidden');
    this.success.classList.add('hidden');
    this.zip.classList.remove('invalid');
    this.country.classList.remove('invalid');
    this.province.classList.remove('invalid');
    this.button.classList.add('loading');
    this.button.setAttribute('disabled', true);

    const body = JSON.stringify({
      shipping_address: {
        zip: this.zip.value,
        country: this.country.value,
        province: this.province.value
      }
    });
    let sectionUrl = `${theme.routes.cart_url}/shipping_rates.json`;

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    fetch(sectionUrl, { ...fetchConfig('javascript'), body })
      .then((response) => response.json())
      .then((parsedState) => {
        if (parsedState.shipping_rates) {
          this.success.classList.remove('hidden');
          this.success.innerHTML = '';
          
          parsedState.shipping_rates.forEach((rate) => {
            const child = document.createElement('p');
            child.innerHTML = `${rate.name}: ${rate.price} ${Shopify.currency.active}`;
            this.success.appendChild(child);
          });
        }
        else {
          let errors = [];
          Object.entries(parsedState).forEach(([attribute, messages]) => {
            errors.push(`${attribute.charAt(0).toUpperCase() + attribute.slice(1)} ${messages[0]}`);
          });

          this.errors.classList.remove('hidden');
          this.errors.querySelector('.errors').innerHTML = errors.join('; ');
        }
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        this.button.classList.remove('loading');
        this.button.removeAttribute('disabled');
      });
  }
}

customElements.define('shipping-calculator', ShippingCalculator);
