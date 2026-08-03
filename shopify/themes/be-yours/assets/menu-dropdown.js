class DropdownMenu extends HTMLElement {
  constructor() {
    super();

    this.classes = {
      hover: 'is-hover',
      active: 'is-active',
      animate: 'show-from-bottom',
    };
    this.selectors = {
      header: '.shopify-section-header',
      background: '.header-background',
      topMenuItem: '.header__menu-item--top',
      menus: 'dropdown-menu, mega-menu',
      wrapper: '.list-menu',
      childAnimate: '.list-menu-dropdown > .list-menu'
    };
    this.timeout;

    //this.addEventListener('focusin', this.handleMouseover.bind(this));
    this.addEventListener('mouseenter', this.handleMouseover.bind(this));
    this.addEventListener('keydown', this.handleKeydown.bind(this));
    // Open dropdown on focus for accessibility
    this.addEventListener('focusin', this.handleFocusIn.bind(this));
  }

  handleMouseover() {
    if (this.classList.contains(this.classes.active)) return;

    this.bindEvent();
    this.removeClasses();
    this.addClasses();
    this.resetBackground();
    this.animateMenu();
  }

  handleMouseleave() {
    if (!this.header) return;

    this.reset();
    this.resetBackground();

    this.header.classList.remove(this.classes.hover);
    this.wrapper.removeEventListener('mouseleave', this.onHeaderMouseLeaveEvent);
  }

  bindEvent() {
    this.onHeaderMouseLeaveEvent = this.onHeaderMouseLeaveEvent || this.handleMouseleave.bind(this);

    this.header = this.header || document.querySelector(this.selectors.header);

    this.wrapper = this.closest(this.selectors.wrapper)
    this.wrapper.addEventListener('mouseleave', this.onHeaderMouseLeaveEvent);
  }

  addClasses() {
    const isTopLevel = this.querySelector(this.selectors.topMenuItem);

    let delay = 0;
    if (isTopLevel && !this.isHover()) {
      delay = 150;

      if (this.closest('.header--top-center') || this.closest('.header--top-left')) {
        delay = 200;
      }
    }
    this.timeout = setTimeout(() => {
      if (this.isHover()) {
        this.classList.add(this.classes.active);
      }
    }, delay);

    this.header.classList.add(this.classes.hover);
  }

  removeClasses() {
    const menus = this.header.querySelectorAll(this.selectors.menus);

    menus.forEach((menu) => {
      let found = false;
      const childMenus = menu.querySelectorAll('dropdown-menu');
      childMenus.forEach((element) => {
        if (element === this) {
          found = true;
          return;
        }
      });

      if (!found) menu.reset();
    });
  }

  isHover() {
    return this.header.classList.contains(this.classes.hover);
  }

  reset() {
    this.classList.remove(this.classes.active);

    const childAnimate =  this.querySelector(this.selectors.childAnimate);
    if (childAnimate) childAnimate.classList.remove(this.classes.animate);

    clearTimeout(this.timeout);
  }

  resetBackground() {
    const background = this.header.querySelector(this.selectors.background);
    background.classList.remove(this.classes.active);
  }

  animateMenu() {
    const childAnimate =  this.querySelector(this.selectors.childAnimate);
    if (childAnimate) {
      setTimeout(() => {
        childAnimate.classList.add(this.classes.animate);
      }, 150);
    }
  }

  close() {
    this.handleMouseleave();
  }

  handleKeydown(event) {
    const ARROW_UP = ['ArrowUp', 'Up'];
    const ARROW_DOWN = ['ArrowDown', 'Down'];
    const ARROW_LEFT = ['ArrowLeft', 'Left'];
    const ARROW_RIGHT = ['ArrowRight', 'Right'];
    const items = Array.from(this.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    const activeElement = document.activeElement;
    const currentIndex = items.indexOf(activeElement);
    if (currentIndex === -1) return;

    if (ARROW_DOWN.includes(event.key)) {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].focus();
    } else if (ARROW_UP.includes(event.key)) {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].focus();
    } else if (ARROW_RIGHT.includes(event.key)) {
      // Try to move right to the next column if possible
      event.preventDefault();
      const nextColumn = activeElement.closest('.mega-menu__item, .list-menu-dropdown')?.nextElementSibling;
      if (nextColumn) {
        const nextFocusable = nextColumn.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (nextFocusable) nextFocusable.focus();
      }
    } else if (ARROW_LEFT.includes(event.key)) {
      // Try to move left to the previous column if possible
      event.preventDefault();
      const prevColumn = activeElement.closest('.mega-menu__item, .list-menu-dropdown')?.previousElementSibling;
      if (prevColumn) {
        const prevFocusable = prevColumn.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (prevFocusable) prevFocusable.focus();
      }
    }
  }

  handleFocusIn(event) {
    // Only open if not already active
    if (!this.classList.contains(this.classes.active)) {
      this.bindEvent();
      this.removeClasses();
      this.addClasses();
      this.resetBackground();
      this.animateMenu();
    }
  }
}
customElements.define('dropdown-menu', DropdownMenu);

class MegaMenu extends HTMLElement {
  constructor() {
    super();

    this.classes = {
      hover: 'is-hover',
      active: 'is-active',
      animate: 'show-from-bottom',
    };
    this.selectors = {
      header: '.shopify-section-header',
      background: '.header-background',
      dropdown: '.list-menu-dropdown',
      menus: 'dropdown-menu, mega-menu',
      wrapper: '.list-menu',
      childAnimate: '.mega-menu__item, .mega-menu__promo'
    };
    this.timeout = [];

    //this.addEventListener('focusin', this.handleMouseover.bind(this));
    this.addEventListener('mouseenter', this.handleMouseover.bind(this));
    this.addEventListener('keydown', this.handleKeydown.bind(this));
    // Open dropdown on focus for accessibility
    this.addEventListener('focusin', this.handleFocusIn.bind(this));

    // Showcase rail tabs — delegated on the element so the bindings
    // survive the deferred-loading innerHTML swap. Tabs switch on CLICK,
    // not hover: hover-switching yanks the content away whenever the
    // pointer strays over the rail while the visitor is still reading.
    // The tabs are real collection links — the first click selects the
    // tab, a click on the already-active tab follows the link.
    if (this.classList.contains('is-showcase')) {
      this.addEventListener('click', this.handleShowcaseClick.bind(this));
      this.addEventListener('focusin', this.handleShowcaseFocus.bind(this));
    }
  }

  handleShowcaseClick(event) {
    const tab = event.target.closest('[data-showcase-tab]');
    if (!tab || !this.contains(tab)) return;
    if (tab.hasAttribute('data-active')) return; // second click: navigate

    event.preventDefault();
    this.activateShowcaseTab(tab);
  }

  handleShowcaseFocus(event) {
    // Keyboard only (:focus-visible): switch the panel while tabbing
    // through the rail. Mouse clicks also focus the tab — without this
    // guard the focus would activate it first and the click would then
    // see an active tab and navigate on the FIRST click.
    const tab = event.target.closest('[data-showcase-tab]');
    if (tab && tab.matches(':focus-visible')) this.activateShowcaseTab(tab);
  }

  activateShowcaseTab(tab) {
    if (tab.hasAttribute('data-active')) return;
    const index = tab.dataset.showcaseTab;

    // Tab headings respond immediately — their color/background/border
    // changes are CSS transitions on .mega-showcase__tab.
    this.querySelectorAll('[data-showcase-tab]').forEach((el) => {
      if (el === tab) el.setAttribute('data-active', '');
      else el.removeAttribute('data-active');
    });

    const swap = () => {
      this.querySelectorAll('[data-showcase-panel]').forEach((el) => {
        el.hidden = el.dataset.showcasePanel !== index;
      });
      // The header background backing the dropdown was sized when the
      // menu opened; a taller tab would spill past it onto the page
      // below. Re-measure on every swap (its transition animates it).
      if (this.header) this.showSublist();
    };

    // Content crossfades instead of popping: dip the container out, swap
    // panels and re-measure the background while nothing is visible, then
    // fade back in. Rapid tab hops reset the timer, so only the final tab
    // is committed and the container dips just once.
    const panels = this.querySelector('.mega-showcase__panels');
    if (!panels) {
      swap();
      return;
    }

    clearTimeout(this.showcaseSwapTimer);
    panels.classList.add('is-switching');
    this.showcaseSwapTimer = setTimeout(() => {
      swap();
      panels.classList.remove('is-switching');
    }, 150);
  }

  handleMouseover() {
    if (this.classList.contains(this.classes.active)) return;
    
    this.bindEvent();
    this.removeClasses();
    this.addClasses();
    this.updateHeaderHeight();
    this.showSublist();
  }

  handleMouseleave() {
    if (!this.header) return;

    this.reset();
    this.resetBackground();

    this.header.classList.remove(this.classes.hover);
    this.wrapper.removeEventListener('mouseleave', this.onHeaderMouseLeaveEvent);
  }

  handleTouchMoveOutside(ev) {
    if (!this.header) return;
    
    let target_section = ev.targetTouches[0].target.closest(this.selectors.header);
    if(!target_section || this.header.classList.contains('shopify-section-header-hidden')) {
      this.reset();
      this.resetBackground();
      
      this.header.classList.remove(this.classes.hover);
      document.removeEventListener('touchmove', this.onHeaderTouchMoveOutsideEvent);
    }
  }

  bindEvent() {
    this.onHeaderMouseLeaveEvent = this.onHeaderMouseLeaveEvent || this.handleMouseleave.bind(this);
    this.onHeaderTouchMoveOutsideEvent = this.onHeaderTouchMoveOutsideEvent || this.handleTouchMoveOutside.bind(this);
    
    this.header = this.header || document.querySelector(this.selectors.header);

    this.wrapper = this.closest(this.selectors.wrapper)
    this.wrapper.addEventListener('mouseleave', this.onHeaderMouseLeaveEvent);
    document.addEventListener('touchmove', this.onHeaderTouchMoveOutsideEvent);
  }

  showSublist() {
    const dropdown = this.querySelector(this.selectors.dropdown);
    const background = this.header.querySelector(this.selectors.background);
    background.style.setProperty('--height', this.header.clientHeight + dropdown.clientHeight + 'px');
    background.classList.add(this.classes.active);
  }

  addClasses() {
    this.classList.add(this.classes.active);

    const childAnimate = this.querySelectorAll(this.selectors.childAnimate);
    const delay = childAnimate.length > 5 ? 75 : 150;
    childAnimate.forEach((element, index) => {
      const timeout = setTimeout(() => {
        element.classList.add(this.classes.animate);
      }, (delay * index) + 100);
      
      this.timeout.push(timeout);
    });
    
    this.header.classList.add(this.classes.hover);
  }

  removeClasses() {
    const menus = this.header.querySelectorAll(this.selectors.menus);
    menus.forEach((menu) => {
      menu.reset();
    });
  }

  reset() {
    this.classList.remove(this.classes.active);

    const childAnimate = this.querySelectorAll(this.selectors.childAnimate);
    childAnimate.forEach((element) => {
      element.classList.remove(this.classes.animate);
    });
    this.timeout.forEach((timeout) => {
      clearTimeout(timeout);
    });
  }

  resetBackground() {
    const background = this.header.querySelector(this.selectors.background);
    background.classList.remove(this.classes.active);
  }

  close() {
    this.handleMouseleave();
  }

  handleKeydown(event) {
    const ARROW_UP = ['ArrowUp', 'Up'];
    const ARROW_DOWN = ['ArrowDown', 'Down'];
    const ARROW_LEFT = ['ArrowLeft', 'Left'];
    const ARROW_RIGHT = ['ArrowRight', 'Right'];
    const items = Array.from(this.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    const activeElement = document.activeElement;
    const currentIndex = items.indexOf(activeElement);
    if (currentIndex === -1) return;

    if (ARROW_DOWN.includes(event.key)) {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].focus();
    } else if (ARROW_UP.includes(event.key)) {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].focus();
    } else if (ARROW_RIGHT.includes(event.key)) {
      // Try to move right to the next column if possible
      event.preventDefault();
      const nextColumn = activeElement.closest('.mega-menu__item, .list-menu-dropdown')?.nextElementSibling;
      if (nextColumn) {
        const nextFocusable = nextColumn.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (nextFocusable) nextFocusable.focus();
      }
    } else if (ARROW_LEFT.includes(event.key)) {
      // Try to move left to the previous column if possible
      event.preventDefault();
      const prevColumn = activeElement.closest('.mega-menu__item, .list-menu-dropdown')?.previousElementSibling;
      if (prevColumn) {
        const prevFocusable = prevColumn.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (prevFocusable) prevFocusable.focus();
      }
    }
  }

  handleFocusIn(event) {
    if (!this.classList.contains(this.classes.active)) {
      this.bindEvent();
      this.removeClasses();
      this.addClasses();
      this.updateHeaderHeight();
      this.showSublist();
    }
  }

  updateHeaderHeight() {
    const headerGroups = document.querySelectorAll('.shopify-section-group-header-group');
    let totalHeaderHeight = 0;
    
    headerGroups.forEach(headerGroup => {
      totalHeaderHeight += headerGroup.offsetHeight;
    });
    
    if (totalHeaderHeight > 0) {
      document.documentElement.style.setProperty('--header-height', `${totalHeaderHeight}px`);
    }
  }

  deferredLoadCallback() {
    if (typeof this.reset === 'function') {
      this.reset();
    }
    
    requestAnimationFrame(() => {
      if (typeof this.handleMouseover === 'function') {
        this.handleMouseover();
      }
    });
  }
}
customElements.define('mega-menu', MegaMenu);
