class SimilarProductsDrawer extends MenuDrawer {
  constructor() {
    super();

    this.setClasses({
      open: 'similar-products--open',
      opening: 'similar-products--opening',
      closing: 'similar-products--closing'
    });

    this.content = this.querySelector('[data-similar-content]');
    this.spinnerHTML = this.content.innerHTML;
    this.cache = new Map();

    this.querySelector('.similar-products__close').addEventListener('click', (event) => {
      this.closeMenuDrawer(event, this.querySelector('summary'));
    });
  }

  openFor(productId) {
    if (!this.mainDetailsToggle.hasAttribute('open')) {
      this.querySelector('summary').click();
    }
    this.load(productId);
  }

  load(productId) {
    if (this.currentId === productId) return;
    this.currentId = productId;
    this.content.innerHTML = this.spinnerHTML;

    const cached = this.cache.get(productId);
    if (cached !== undefined) {
      this.render(productId, cached);
      return;
    }

    fetch(`${this.dataset.url}&product_id=${productId}`)
      .then((response) => response.text())
      .then((text) => {
        const grid = new DOMParser().parseFromString(text, 'text/html').querySelector('[data-similar-grid]');
        const html = grid ? grid.innerHTML : '';
        this.cache.set(productId, html);
        this.render(productId, html);
      })
      .catch((error) => {
        console.error('SimilarProducts:', error);
        // Not cached: closing and reopening the drawer retries the fetch
        if (this.currentId === productId) this.currentId = null;
        this.render(productId, '');
      });
  }

  render(productId, html) {
    // The shopper may have opened another card while this fetch was in flight
    if (this.currentId !== productId && this.cache.has(productId)) return;
    this.content.innerHTML = html.trim().length
      ? html
      : `<p class="similar-products__empty">${this.dataset.emptyText}</p>`;
  }
}
customElements.define('similar-products-drawer', SimilarProductsDrawer);

class SimilarProductsButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', this.open.bind(this));
    this.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.open();
    });
  }

  open() {
    const drawer = document.querySelector('similar-products-drawer');
    if (drawer) drawer.openFor(this.dataset.productId);
  }
}
customElements.define('similar-products-button', SimilarProductsButton);
