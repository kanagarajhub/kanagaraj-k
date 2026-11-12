/**
 * Ecom guide grid.
 * Vanilla JS only. Opens a product popup, renders variant options from the
 * product JSON printed by the section, and adds the chosen variant to the cart.
 *
 * Bundle rule: when the selected variant includes every trigger value,
 * in any option order (Black + Medium, or Medium + Black), the extra
 * product is added in the same cart request.
 */
(function () {
  var COLOR_BARS = {
    black: '#111111',
    blue: '#2f6bff',
    white: '#f3f3f3',
    red: '#d12b2c',
    green: '#1f8a4c',
    navy: '#1d2a57',
    grey: '#8a8a8a',
    gray: '#8a8a8a',
    brown: '#6b4423',
    beige: '#d9c7a3',
    pink: '#e56b93',
    yellow: '#e2c200',
    orange: '#e07a1f',
    purple: '#6b3fa0'
  };

  /* Dummy catalog used until a real product is chosen in the customizer. */
  var DEMOS = [
    demo('Tailored Jacket', 98000, 'This one-piece swimsuit is crafted from jersey featuring an allover micro Monogram motif in relief.'),
    demo('Crossbody Bag', 42000, 'A structured everyday bag with a wide strap and room for the day.'),
    demo('Flannel Shirt', 18000, 'Brushed cotton flannel, cut for an easy layer through the colder months.'),
    demo('Leather Jacket', 64000, 'A clean leather jacket with a slight crop and a matte finish.'),
    demo('Varsity Jacket', 31000, 'Wool body, leather sleeves, and a single chest mark.'),
    demo('Weekend Set', 25000, 'An easy set for travel days, in a washed cotton twill.')
  ];

  function demo(title, price, description) {
    var colors = ['Blue', 'Black'];
    var sizes = ['XS', 'S', 'Medium', 'L', 'XL'];
    var variants = [];
    colors.forEach(function (color) {
      sizes.forEach(function (size) {
        variants.push({
          id: null,
          available: true,
          price: price,
          compareAtPrice: null,
          title: color + ' / ' + size,
          option1: color,
          option2: size,
          option3: null,
          options: [color, size],
          image: null
        });
      });
    });
    return {
      demo: true,
      title: title,
      description: description,
      featuredImage: null,
      options: [
        { name: 'Color', values: colors },
        { name: 'Size', values: sizes }
      ],
      variants: variants
    };
  }

  function bootAll(scope) {
    (scope || document).querySelectorAll('[data-ecom-guide]').forEach(boot);
  }

  if (!window.__giftGuideGrid) {
    window.__giftGuideGrid = true;
    document.addEventListener('shopify:section:load', function (event) {
      bootAll(event.target);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bootAll(); }, { once: true });
  } else {
    bootAll();
  }

  function boot(root) {
    if (root.dataset.ggReady === 'true') return;
    root.dataset.ggReady = 'true';

    var modal = root.querySelector('[data-gg-modal]');
    var dialog = root.querySelector('[data-gg-dialog]');
    var media = root.querySelector('[data-gg-media]');
    var title = root.querySelector('[data-gg-title]');
    var price = root.querySelector('[data-gg-price]');
    var description = root.querySelector('[data-gg-description]');
    var options = root.querySelector('[data-gg-options]');
    var message = root.querySelector('[data-gg-message]');
    var addButton = root.querySelector('[data-gg-add]');
    var addLabel = root.querySelector('[data-gg-add-label]');
    var state = { product: null, selection: {}, card: null, lastFocus: null };

    function showMessage(text) {
      message.hidden = false;
      message.textContent = text;
    }

    function clearMessage() {
      message.hidden = true;
      message.textContent = '';
    }

    if (root.dataset.animate === 'true' && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.18 });
      root.querySelectorAll('.gg-card').forEach(function (card) { observer.observe(card); });
    } else {
      root.querySelectorAll('.gg-card').forEach(function (card) { card.classList.add('is-visible'); });
    }

    root.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-gg-open]');
      if (!opener || !root.contains(opener)) return;
      open(opener.closest('.gg-card'), opener);
    });

    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-gg-close]')) close();
    });

    addButton.addEventListener('click', onAdd);

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      var focusable = dialog.querySelectorAll('button:not(:disabled), select, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function open(card, opener) {
      if (!card) return;
      state.card = card;
      state.product = readProduct(card);
      state.selection = {};
      state.lastFocus = opener || document.activeElement;
      clearMessage();
      render();
      modal.hidden = false;
      document.documentElement.classList.add('gg-modal-open');
      document.addEventListener('keydown', onKeydown);
      var closeButton = modal.querySelector('[data-gg-close].gg-modal__close');
      if (closeButton) closeButton.focus();
    }

    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.documentElement.classList.remove('gg-modal-open');
      document.removeEventListener('keydown', onKeydown);
      if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
    }

    function readProduct(card) {
      var node = card.querySelector('[data-gg-product]');
      if (!node) {
        var index = Number(card.dataset.demoIndex || 0);
        return DEMOS[index] || DEMOS[0];
      }
      try {
        var product = JSON.parse(node.textContent);
        product.demo = false;
        return product;
      } catch (error) {
        return DEMOS[0];
      }
    }

    function render() {
      var product = state.product;
      title.textContent = product.title || '';
      description.textContent = String(product.description || '').replace(/\s+/g, ' ').trim();
      paintMedia(null);
      options.replaceChildren();

      (product.options || []).forEach(function (option) {
        var values = option.values || [];
        if (values.length <= 1) {
          if (values[0]) state.selection[option.name] = values[0];
          return;
        }
        if (controlKind(option) === 'select') {
          options.appendChild(buildSelect(option));
          return;
        }
        state.selection[option.name] = state.selection[option.name] || values[0];
        options.appendChild(buildChoices(option));
      });

      syncVariant();
    }

    function controlKind(option) {
      var name = normalize(option.name);
      if (name.indexOf('size') !== -1 || name.indexOf('taille') !== -1) return 'select';
      if (name.indexOf('color') !== -1 || name.indexOf('colour') !== -1) {
        return option.values.length > 6 ? 'select' : 'buttons';
      }
      return option.values.length > 4 ? 'select' : 'buttons';
    }

    function buildChoices(option) {
      var field = document.createElement('div');
      field.className = 'gg-option';
      var label = document.createElement('span');
      label.className = 'gg-option__label';
      label.textContent = option.name;
      field.appendChild(label);

      var row = document.createElement('div');
      row.className = 'gg-choices';
      row.setAttribute('role', 'radiogroup');
      row.setAttribute('aria-label', option.name);

      option.values.forEach(function (value) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'gg-choice';
        button.textContent = value;
        button.setAttribute('role', 'radio');
        button.dataset.value = value;
        if (COLOR_BARS[normalize(value)]) button.style.setProperty('--gg-choice-bar', COLOR_BARS[normalize(value)]);
        if (state.selection[option.name] === value) {
          button.classList.add('is-selected');
          button.setAttribute('aria-checked', 'true');
        } else {
          button.setAttribute('aria-checked', 'false');
        }
        button.addEventListener('click', function () {
          state.selection[option.name] = value;
          row.querySelectorAll('.gg-choice').forEach(function (choice) {
            var selected = choice.dataset.value === value;
            choice.classList.toggle('is-selected', selected);
            choice.setAttribute('aria-checked', selected ? 'true' : 'false');
          });
          syncVariant();
        });
        row.appendChild(button);
      });

      field.appendChild(row);
      return field;
    }

    function buildSelect(option) {
      var field = document.createElement('div');
      field.className = 'gg-option';
      var label = document.createElement('label');
      label.className = 'gg-option__label';
      var selectId = 'gg-opt-' + root.dataset.sectionId + '-' + normalize(option.name).replace(/\s+/g, '-');
      label.setAttribute('for', selectId);
      label.textContent = option.name;
      field.appendChild(label);

      var select = document.createElement('select');
      select.id = selectId;
      select.className = 'gg-select';
      var prompt = document.createElement('option');
      prompt.value = '';
      prompt.textContent = sizePrompt(option);
      select.appendChild(prompt);
      option.values.forEach(function (value) {
        var choice = document.createElement('option');
        choice.value = value;
        choice.textContent = value;
        select.appendChild(choice);
      });
      select.addEventListener('change', function () {
        state.selection[option.name] = select.value;
        syncVariant();
      });
      field.appendChild(select);
      return field;
    }

    function sizePrompt(option) {
      if (normalize(option.name).indexOf('size') !== -1 && root.dataset.labelChoose) {
        return root.dataset.labelChoose;
      }
      return 'Choose ' + option.name.toLowerCase();
    }

    function syncVariant() {
      var variant = matchingVariant(state.product, state.selection, false);
      var exact = isComplete(state.product, state.selection) ? matchingVariant(state.product, state.selection, true) : null;
      var shown = exact || variant;
      if (shown) {
        paintPrice(shown);
        paintMedia(shown.image);
      }
      var soldOut = exact && exact.available === false;
      addButton.disabled = Boolean(soldOut);
      addLabel.textContent = soldOut ? (root.dataset.labelSoldout || 'Sold out') : (root.dataset.labelAdd || 'Add to cart');
      clearMessage();
    }

    function paintPrice(variant) {
      price.replaceChildren();
      price.appendChild(document.createTextNode(formatMoney(variant.price, root.dataset.moneyFormat)));
      if (variant.compareAtPrice && Number(variant.compareAtPrice) > Number(variant.price)) {
        var compare = document.createElement('span');
        compare.className = 'gg-modal__compare';
        compare.textContent = formatMoney(variant.compareAtPrice, root.dataset.moneyFormat);
        price.appendChild(compare);
      }
    }

    function paintMedia(src) {
      media.replaceChildren();
      if (src) {
        var image = document.createElement('img');
        image.src = src;
        image.alt = state.product.title || '';
        media.appendChild(image);
        return;
      }
      var visual = state.card && state.card.querySelector('[data-gg-visual]');
      if (visual) media.appendChild(visual.cloneNode(true));
    }

    async function onAdd() {
      if (addButton.classList.contains('is-loading') || addButton.disabled) return;
      clearMessage();
      var product = state.product;
      if (!product || product.demo) {
        showMessage(root.dataset.labelPlaceholder || 'Select a product in the theme editor to enable add to cart.');
        return;
      }

      var missing = firstMissing(product, state.selection);
      if (missing) {
        showMessage(sizePrompt(missing));
        return;
      }

      var variant = matchingVariant(product, state.selection, true);
      if (!variant || !variant.id) {
        showMessage('This combination is not available.');
        return;
      }
      if (variant.available === false) {
        showMessage(root.dataset.labelSoldout || 'Sold out');
        return;
      }

      addButton.classList.add('is-loading');
      addButton.setAttribute('aria-busy', 'true');
      addLabel.textContent = root.dataset.labelAdding || 'Adding…';

      try {
        var ids = [variant.id];
        var companionNote = '';
        if (shouldBundle(variant, state.selection)) {
          var companionId = await resolveCompanion(triggerValues());
          var companionName = root.dataset.companionTitle || 'The extra product';
          if (!companionId) {
            companionNote = 'This product was added. ' + companionName + ' was not found — choose it as the auto-add product in the theme editor.';
          } else if (String(companionId) !== String(variant.id)) {
            ids.push(companionId);
          }
        }
        var response;
        try {
          response = await postAdd(ids, true);
        } catch (error) {
          if (ids.length < 2) throw error;
          response = await postAdd([variant.id], true);
          companionNote = 'This product was added. ' + (root.dataset.companionTitle || 'The extra product') + ' could not be added: ' + error.message;
        }
        if (companionNote) {
          updateBubble(response);
          showMessage(companionNote);
          return;
        }
        notifyTheme(variant.id, response);
        var notification = document.querySelector('cart-notification');
        if (notification && response && response.sections) {
          close();
          revealCart(response);
        } else {
          showMessage('Added to cart.');
        }
      } catch (error) {
        showMessage(error.message || 'Could not add this product to the cart.');
      } finally {
        addButton.classList.remove('is-loading');
        addButton.removeAttribute('aria-busy');
        if (!addButton.disabled) addLabel.textContent = root.dataset.labelAdd || 'Add to cart';
      }
    }

    function triggerValues() {
      return [root.dataset.triggerA, root.dataset.triggerB].map(normalize).filter(Boolean);
    }

    /**
     * The two boxes are values. They match the variant's own option values,
     * so Color/Size or Size/Color are the same combination.
     */
    function shouldBundle(variant, selection) {
      var triggers = triggerValues();
      if (!triggers.length) return false;
      if (hasValues(variant, triggers)) return true;
      var picked = {
        options: Object.keys(selection || {}).map(function (name) { return selection[name]; })
      };
      return hasValues(picked, triggers);
    }

    async function resolveCompanion(triggers) {
      var variants = await companionVariants();
      var matched = variants.find(function (item) {
        return item.available !== false && hasValues(item, triggers);
      }) || variants.find(function (item) { return hasValues(item, triggers); });
      if (matched) return String(matched.id);
      if (root.dataset.companionId) return root.dataset.companionId;
      var fallback = variants.find(function (item) { return item.available; }) || variants[0];
      return fallback ? String(fallback.id) : '';
    }

    async function companionVariants() {
      if (root._companionVariants) return root._companionVariants;
      root._companionVariants = [];
      var handle = (root.dataset.companionHandle || '').trim();
      var title = (root.dataset.companionTitle || 'Soft Winter Jacket').trim();
      try {
        if (!handle) {
          var searchUrl = '/search/suggest.json?q=' + encodeURIComponent(title) +
            '&resources[type]=product&resources[limit]=10&resources[options][fields]=title';
          var search = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
          var payload = await search.json();
          var products = (payload.resources && payload.resources.results && payload.resources.results.products) || [];
          var match = products.find(function (item) {
            return item.title && normalize(item.title) === normalize(title);
          });
          handle = match && match.handle ? match.handle : '';
        }
        if (!handle) return root._companionVariants;
        var productResponse = await fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } });
        if (!productResponse.ok) return root._companionVariants;
        var product = await productResponse.json();
        if (title && product.title && normalize(product.title) !== normalize(title) && !root.dataset.companionHandle) {
          return root._companionVariants;
        }
        root._companionVariants = product.variants || [];
        return root._companionVariants;
      } catch (error) {
        return root._companionVariants;
      }
    }

    function notifyTheme(variantId, response) {
      if (typeof publish !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'ecom-guide',
        productVariantId: variantId,
        cartData: response
      });
    }
  }

  function firstMissing(product, selection) {
    var missing = null;
    (product.options || []).some(function (option) {
      if ((option.values || []).length <= 1) return false;
      if (!selection[option.name]) {
        missing = option;
        return true;
      }
      return false;
    });
    return missing;
  }

  function isComplete(product, selection) {
    return !firstMissing(product, selection);
  }

  /**
   * exact=false returns the first variant that agrees with every option
   * the shopper has already chosen, so price and image can update early.
   */
  function matchingVariant(product, selection, exact) {
    var options = product.options || [];
    return (product.variants || []).find(function (variant) {
      return options.every(function (option, index) {
        var chosen = selection[option.name];
        if (!chosen) return !exact;
        return normalize(optionSlot(variant, index)) === normalize(chosen);
      });
    }) || null;
  }

  function optionSlot(variant, index) {
    var listed = variant.options && variant.options[index];
    if (listed != null && listed !== '') return listed;
    return variant['option' + (index + 1)];
  }

  function variantValues(variant) {
    var values = [];
    function add(value) {
      var token = normalize(value);
      if (!token || token === 'default title') return;
      if (values.indexOf(token) === -1) values.push(token);
    }
    if (!variant) return values;
    add(variant.option1);
    add(variant.option2);
    add(variant.option3);
    (variant.options || []).forEach(add);
    return values;
  }

  function hasValues(variant, triggers) {
    if (!triggers.length) return false;
    var values = variantValues(variant);
    return triggers.every(function (trigger) { return values.indexOf(normalize(trigger)) !== -1; });
  }

  function postAdd(variantIds, requestSections) {
    var ids = [].concat(variantIds).filter(Boolean).map(function (id) { return Number(id); });
    var payload = ids.length > 1
      ? { items: ids.map(function (id) { return { id: id, quantity: 1 }; }) }
      : { id: ids[0], quantity: 1 };
    if (requestSections) {
      payload.sections = 'cart-notification-product,cart-notification-button,cart-icon-bubble';
      payload.sections_url = window.location.pathname;
    }
    var url = (window.routes && window.routes.cart_add_url) || '/cart/add';
    if (url.indexOf('.js') === -1) url += '.js';
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || data.status) {
          throw new Error(data.description || data.message || 'Could not add this product to the cart.');
        }
        return data;
      });
    });
  }

  function revealCart(response) {
    var notification = document.querySelector('cart-notification');
    var several = response.items && response.items.length > 1;
    if (!several && notification && response.key && response.sections && typeof notification.renderContents === 'function') {
      try {
        notification.renderContents(response);
        return;
      } catch (error) {
        updateBubble(response);
        return;
      }
    }
    if (notification && response.sections) {
      ['cart-notification-product', 'cart-notification-button', 'cart-icon-bubble'].forEach(function (id) {
        var html = response.sections[id];
        var slot = document.getElementById(id);
        if (!html || !slot) return;
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var section = parsed.querySelector('.shopify-section');
        if (section) slot.innerHTML = section.innerHTML;
      });
      if (typeof notification.open === 'function') notification.open();
      return;
    }
    updateBubble(response);
  }

  function updateBubble(response) {
    var html = response && response.sections && response.sections['cart-icon-bubble'];
    var bubble = document.getElementById('cart-icon-bubble');
    if (html && bubble) {
      var parsed = new DOMParser().parseFromString(html, 'text/html');
      var section = parsed.querySelector('.shopify-section');
      if (section) {
        bubble.innerHTML = section.innerHTML;
        return;
      }
    }
    var cartUrl = ((window.routes && window.routes.cart_url) || '/cart') + '.js';
    fetch(cartUrl, { headers: { Accept: 'application/json' } })
      .then(function (response) { return response.json(); })
      .then(function (cart) {
        if (!bubble) return;
        var count = bubble.querySelector('.cart-count-bubble [aria-hidden="true"]');
        if (count) count.textContent = String(cart.item_count);
      })
      .catch(function () {});
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function formatMoney(cents, format) {
    var amount = Number(cents);
    if (!isFinite(amount)) amount = 0;
    var formatString = String(format || '${{amount}}').replace(/<[^>]*>/g, '');
    var match = formatString.match(/\{\{\s*(\w+)\s*\}\}/);
    var token = match ? match[1] : 'amount';
    var value;
    switch (token) {
      case 'amount_no_decimals':
        value = formatWith(amount, 0, ',', '.');
        break;
      case 'amount_with_comma_separator':
        value = formatWith(amount, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWith(amount, 0, '.', ',');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWith(amount, 2, "'", '.');
        break;
      case 'amount_with_space_separator':
        value = formatWith(amount, 2, ' ', ',');
        break;
      case 'amount_with_period_and_space_separator':
        value = formatWith(amount, 2, ' ', '.');
        break;
      default:
        value = formatWith(amount, 2, ',', '.');
    }
    return formatString.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function formatWith(cents, precision, thousands, decimal) {
    var number = (cents / 100).toFixed(precision);
    var parts = number.split('.');
    var dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return parts[1] ? dollars + decimal + parts[1] : dollars;
  }

})();
