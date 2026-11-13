/**
 * Global Reactive State Manager for Nayak's Sujay App
 */

const State = {
  settings: null,
  categories: [],
  currentInvoice: null,
  activeView: 'dashboard', // dashboard, create-invoice, archive, settings
  stats: null,
  listeners: {},

  init(settings, categories) {
    this.settings = settings;
    this.categories = categories;
  },

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },

  setView(viewName) {
    this.activeView = viewName;
    this.emit('view:change', viewName);
  }
};

window.State = State;
