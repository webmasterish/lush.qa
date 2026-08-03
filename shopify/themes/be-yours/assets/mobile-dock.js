class MobileDock extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const header = document.querySelector('.shopify-section-header');

    this.isAction = false;
    this.scrollY  = header ? parseInt(header.getBoundingClientRect().bottom) : 0;

    if (Shopify && Shopify.designMode) {
      this.scrollY = 0;
    }

    this.onDrawerCloseHandler = this.hideStickyHeader.bind(this);
    this.querySelectorAll('.dock__item[data-action]').forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
    document.addEventListener('menudrawer:close', this.onDrawerCloseHandler);
    document.addEventListener('searchmodal:close', this.onDrawerCloseHandler);

    // rAF-gated scroll handler: at most one class toggle per frame
    this.scrollTicking = false;
    this.onScrollHandler = () => {
      if (this.scrollTicking) return;
      this.scrollTicking = true;
      requestAnimationFrame(() => {
        this.onScroll();
        this.scrollTicking = false;
      });
    };
    window.addEventListener('scroll', this.onScrollHandler, { passive: true });
    this.onScroll();

    this.onMatchSmallHandler = () => {
      document.documentElement.style.setProperty('--mobile-dock-height', `${this.offsetHeight}px`);
    };
    this.onMatchSmallHandler();
    document.addEventListener('matchSmall', this.onMatchSmallHandler);
    // The dock stylesheet loads async (media=print swap) while this script
    // is deferred, so the measurement above can run against the unstyled
    // element and write 0px — remeasure once every stylesheet has applied.
    // Consumers: footer-group padding and the social floating offset.
    window.addEventListener('load', this.onMatchSmallHandler, { once: true });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScrollHandler);
    document.removeEventListener('menudrawer:close', this.onDrawerCloseHandler);
    document.removeEventListener('searchmodal:close', this.onDrawerCloseHandler);
    document.removeEventListener('matchSmall', this.onMatchSmallHandler);
    window.removeEventListener('load', this.onMatchSmallHandler);
  }

  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop >= this.scrollY) {
      this.classList.add('is-active');
    }
    else {
      this.classList.remove('is-active');
    }
  }

  onButtonClick(event) {
    event.preventDefault();
    const target = event.currentTarget;
    // Search handles the hidden header itself (instant, same-frame) — the
    // animated waitStickyHeader() reveal would paint the header + menu
    // sliding in over mid-page content before the modal opens, a slow
    // two-step.
    const delay = target.dataset.action === 'search' ? 0 : this.waitStickyHeader();

    switch (target.dataset.action) {
      case 'cart':
        this.isAction = true;

        const miniCart = document.querySelector('mini-cart');
        if (miniCart) {
          setTimeout(() => {
            miniCart.open();
            document.activeElement.blur();
          }, delay);
        }
        else {
          window.location.href = theme.routes.cart_url;
        }
        break;

      case 'menu':
        this.isAction = true;

        const headerDrawer = document.querySelector('header-drawer');
        if (headerDrawer) {
          setTimeout(() => {
            headerDrawer.openMenuDrawer();
          }, delay);
        }
        break;

      case 'search':
        this.isAction = true;

        const searchModals = document.querySelectorAll('search-modal');
        if (searchModals.length > 0) {
          const openModals = () => {
            searchModals.forEach((searchModal) => {
              const style = window.getComputedStyle(searchModal);
              if (style.display === 'none') {
                return;
              }

              searchModal.open();
              searchModal.querySelector('input:not([type="hidden"])').focus();
            });
          };

          // The search modal is anchored inside the header, so an off-screen
          // header cannot be left as-is: a non-sticky header only exists at
          // the page top, and a hidden sticky header carries a translateY
          // transform that becomes the containing block for the modal's
          // position:fixed (it would open off-screen — blank overlay, no
          // input). Resolve the header in the SAME frame the modal opens,
          // with the fade-in suppressed: any separate "prepare the header
          // first" step paints an intermediate state (header + menu sliding
          // in over mid-page content) that reads as a slow two-step open.
          const headerSection = document.querySelector('.shopify-section-header');
          const stickyHeader = document.querySelector('sticky-header');
          if (headerSection && !this.isElementVisible(headerSection)) {
            document.body.classList.add('search-modal--instant');

            if (stickyHeader === null) {
              // Non-sticky: the header lives at the page top — jump there.
              window.scrollTo({ top: 0, behavior: 'instant' });
            }
            else {
              // Sticky: reveal in place, minus the .animate class so the
              // transform snaps instead of sliding — header and the modal
              // covering it reach the screen in one paint, and the visitor
              // keeps their scroll position for when the modal closes.
              stickyHeader.reveal();
              stickyHeader.header.classList.remove('animate');
            }

            // Open on the next animation frame: AFTER this click has finished
            // bubbling (opening synchronously lets the modal's outside-click
            // handler see the very same click and close it again instantly),
            // but BEFORE the browser paints — so there is still no flash of
            // the revealed header or page-top content.
            requestAnimationFrame(() => openModals());
            // Keep the class until the modal closes: removing it while open
            // makes the fade-in rule match again, which RESTARTS the CSS
            // animation — the modal blinks to opacity 0 and fades back.
            document.addEventListener('searchmodal:close', () => {
              document.body.classList.remove('search-modal--instant');
            }, { once: true });
          }
          else {
            setTimeout(openModals, delay);
          }
        }
        else {
          window.location.href = theme.routes.search_url;
        }
        break;
    }
  }

  hideStickyHeader() {
    const header = document.querySelector('sticky-header');
    if (header === null) return;

    if (theme.config.mqlSmall && this.isAction && header.sticky()) {
      setTimeout(() => {
        header.hide();
        this.isAction = false;
      }, 500);
    }
  }

  waitStickyHeader() {
    const header = document.querySelector('sticky-header');
    if (header === null) return;

    if (!header.sticky() && !this.isElementVisible(header)) {
      header.hide();
      setTimeout(() => header.reveal());

      return 250;
    }

    return 0;
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect(),
        width  = window.innerWidth || document.documentElement.clientWidth,
        height = window.innerHeight || document.documentElement.clientHeight,
        efp    = function (x, y) { return document.elementFromPoint(x, y) };

    // Return false if it's not in the viewport
    if (rect.right < 0 || rect.bottom < 0 || rect.left > width || rect.top > height) {
      return false;
    }

    // Return true if any of its four corners are visible
    return (
      element.contains(efp(rect.left,  rect.top))
      || element.contains(efp(rect.right, rect.top))
      || element.contains(efp(rect.right, rect.bottom))
      || element.contains(efp(rect.left,  rect.bottom))
      || element.parentNode.contains(efp(rect.left,  rect.top))
      || element.parentNode.contains(efp(rect.right, rect.top))
      || element.parentNode.contains(efp(rect.right, rect.bottom))
      || element.parentNode.contains(efp(rect.left,  rect.bottom))
    );
  }
}
customElements.define('mobile-dock', MobileDock);
