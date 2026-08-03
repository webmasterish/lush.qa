/* assets > voice-search.js
   <voice-search-button> — Web Speech API microphone for search fields.

   Progressive enhancement: the element removes itself on browsers without
   SpeechRecognition (Firefox, most in-app webviews) and for the rest of the
   session once the visitor denies microphone permission — unsupported
   visitors never see a dead button.

   Recognition results are written into the sibling search input and
   dispatched as a real `input` event, so the existing predictive-search
   pipeline (debounce, fetch, panel) picks them up unchanged. No auto-submit:
   the visitor reviews the predictive results and picks one.
*/

(function () {
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var DENIED_KEY = 'voice-search-denied';

  function sessionDenied() {
    try {
      return sessionStorage.getItem(DENIED_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  class VoiceSearchButton extends HTMLElement {
    connectedCallback() {
      if (!Recognition || sessionDenied()) {
        this.remove();
        return;
      }

      this.button = this.querySelector('button');
      this.input = this.closest('.field')?.querySelector('input[type="search"]');
      if (!this.button || !this.input) {
        this.remove();
        return;
      }

      this.defaultPlaceholder = this.input.placeholder;
      this.onClickHandler = this.onClick.bind(this);
      this.button.addEventListener('click', this.onClickHandler);
    }

    disconnectedCallback() {
      this.button?.removeEventListener('click', this.onClickHandler);
      this.stop();
    }

    onClick() {
      if (this.recognition) this.stop();
      else this.start();
    }

    start() {
      // One live recognition at a time across all instances
      if (VoiceSearchButton.active && VoiceSearchButton.active !== this) {
        VoiceSearchButton.active.stop();
      }
      VoiceSearchButton.active = this;

      var recognition = new Recognition();
      this.recognition = recognition;
      recognition.lang = document.documentElement.lang || 'en';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        var transcript = '';
        for (var i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        transcript = transcript.trim();
        if (!transcript) return;
        this.input.value = transcript;
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.markDenied();
          return;
        }
        this.stop();
      };

      // Fires after stop(), errors, and when the engine gives up on its own
      // (Safari ends early and often) — always our single cleanup path.
      recognition.onend = () => {
        this.recognition = null;
        this.setListening(false);
      };

      this.setListening(true);
      this.input.focus();

      try {
        recognition.start();
      } catch (e) {
        this.stop();
      }
    }

    stop() {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          // already stopped
        }
        this.recognition = null;
      }
      this.setListening(false);
    }

    setListening(on) {
      this.classList.toggle('listening', on);
      this.button.setAttribute('aria-pressed', on ? 'true' : 'false');
      this.input.placeholder = on
        ? this.dataset.listeningText || this.defaultPlaceholder
        : this.defaultPlaceholder;
    }

    markDenied() {
      try {
        sessionStorage.setItem(DENIED_KEY, '1');
      } catch (e) {
        // storage unavailable — in-memory removal below still applies
      }
      document.querySelectorAll('voice-search-button').forEach(function (el) {
        el.remove();
      });
    }
  }

  customElements.define('voice-search-button', VoiceSearchButton);
})();
