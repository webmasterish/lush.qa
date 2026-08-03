class CartRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    new IntersectionObserver(this.handleIntersection.bind(this)).observe(this);
  }

  handleIntersection(entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.unobserve(this);
    
    fetch(this.dataset.url)
      .then(response => response.text())
      .then(text => {
        const html = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector('.shopify-section');
        if (html === null) return;
        
        const recommendations = html.querySelector('cart-recommendations');
        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }
      })
      .catch(e => {
        console.error(e);
      });
  }
}
customElements.define('cart-recommendations', CartRecommendations);
