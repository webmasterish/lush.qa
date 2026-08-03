class MiniCart extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.header = document.querySelector('sticky-header');
    this.drawer = document.querySelector('cart-drawer');
    new IntersectionObserver(this.handleIntersection.bind(this)).observe(this);
  }

  handleIntersection(entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.unobserve(this);

    fetch(this.dataset.url)
      .then(response => response.text())
      .then(html => {
        document.getElementById('mini-cart').innerHTML =
          this.getSectionInnerHTML(html, '.shopify-section');
          
          document.dispatchEvent(new CustomEvent('cartdrawer:opened'));
      })
      .catch(e => {
        console.error(e);
      });
  }

  open() {
    const detailsElement = this.drawer.querySelector('details');
    if (detailsElement.hasAttribute('open')) {
      return;
    }
    
    this.drawer.openMenuDrawer();
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;

    // While the drawer is open (upsell adds, gift wrap, quick view),
    // patch the money-touched regions instead of swapping the whole
    // drawer — keeps open collapsibles, scroll and upsell state intact.
    const drawerOpen = this.drawer && !!this.drawer.querySelector('details[open]');

    this.getSectionsToRender().forEach((section => {
      if (!document.getElementById(section.id)) return;

      if (
        section.id === 'mini-cart' &&
        drawerOpen &&
        window.theme && theme.patchMiniCart &&
        parsedState.sections[section.id] &&
        theme.patchMiniCart(this.getSectionInnerHTML(parsedState.sections[section.id], section.selector))
      ) return;

      document.getElementById(section.id).innerHTML =
        this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    }));

    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'mini-cart',
        section: 'mini-cart',
        selector: '.shopify-section'
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
      }
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('mini-cart', MiniCart);
