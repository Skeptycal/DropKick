/**
 * DropKick 1.2
 *
 * Highly customizable <select> lists
 * https://github.com/robdel12/DropKick
 *
 * 2011 Jamie Lottering <http://github.com/JamieLottering>
 *                        <http://twitter.com/JamieLottering>
 *
*/

(function ($, window, document) {
  'use strict';

  var 
    msVersion = navigator.userAgent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/),
    msie = !!msVersion,
    ie6 = msie && parseFloat(msVersion[1]) < 7,

    // Public methods exposed to $.fn.dropkick()
    methods = {},

    // Cache every <select> element that gets dropkicked
    lists   = [],

    // Convenience keys for keyboard navigation
    keyMap = {
      'left'  : 37,
      'up'    : 38,
      'right' : 39,
      'down'  : 40,
      'enter' : 13,
      'tab'   : 9,
      'zero'  : 48,
      'z'     : 90,
      'last': 221  //support extend charsets such as Danish, Ukrainian etc.
    },

    // HTML template for the dropdowns
    dropdownTemplate = [
      '<div class="dk_container" id="dk_container_{{ id }}" tabindex="{{ tabindex }}">',
      '   <a class="dk_toggle">',
      '   <span class="dk_label">{{ label }}</span>',
      ' </a>',
      ' <div class="dk_options">',
      '   <ul class="dk_options_inner">',
      '   </ul>',
      ' </div>',
      '</div>'
    ].join(''),

    // HTML template for dropdown options
    optionTemplate = '<li class="{{ current }} {{ disabled }}"><a data-dk-dropdown-value="{{ value }}">{{ text }}</a></li>',

    // Some nice default values
    defaults = {
      startSpeed : 400,  // I reccomend a low value (lowest is probably 100) to stop a "fade in" effect.
      theme  : false,
      change : false,
      syncReverse: true
    },

    // Make sure that only one dropdown is open the document
    $opened = null,

    // Make sure that only one dropdown has focus in the document
    $focused = null,

    // private
    // Update the <select> value, and the dropdown label
    updateFields = function(option, $dk, reset, e) {
      var value, label, data, $select;

      value = option.attr('data-dk-dropdown-value');
      label = option.text();
      data  = $dk.data('dropkick');

      $select = data.$select;
      $select.val(value).trigger('change'); // Added to let it act like a normal select [Acemir >> In fact, I suggest that this must always be true]

      $dk.find('.dk_label').text(label);

      reset = reset || false;

      if (data.settings.change && !reset && !data.settings.syncReverse) {
        data.settings.change.call($select, value, label);
      }
    },
   
    // Close a dropdown
    closeDropdown = function($dk) {
      $dk.removeClass('dk_open');
      $opened = null;
    },

    // Report whether there is enough space in the window to drop down.
    enoughSpace = function($dk)  {
      var
        $dk_toggle = $dk.find('.dk_toggle'),
        optionsHeight = $dk.find('.dk_options').outerHeight(),
        spaceBelow = $(window).height() - $dk_toggle.outerHeight() - $dk_toggle.offset().top + $(window).scrollTop(),
        spaceAbove = $dk_toggle.offset().top - $(window).scrollTop()
      ;
      // [Acemir] If no space above, default is opens down. If has space on top, check if will need open it to up
      return !(optionsHeight < spaceAbove) ? true : (optionsHeight < spaceBelow);
    },
    
    setScrollPos = function($dk, anchor, e) {
      var
        wrapper = $dk.find('.dk_options_inner'),
        height = anchor.prevAll('li').outerHeight() * anchor.prevAll('li').length,
        minHeight = wrapper.scrollTop(),
        maxHeight = wrapper.height() + wrapper.scrollTop() - anchor.outerHeight()
      ;

      if ( (e && e.type === 'keydown') || (height < minHeight || height > maxHeight) ) {
        wrapper.scrollTop(height); // A more direct approach
      }
    },

    // Open a dropdown
    openDropdown = function($dk,e) {
      var
        data = $dk.data('dropkick'),
        hasSpace = enoughSpace($dk) // Avoids duplication of call to _enoughSpace
      ; 
      $dk.find('.dk_options').css({
        top : hasSpace ? $dk.find('.dk_toggle').outerHeight() - 1 : '',
        bottom : hasSpace ? '' : $dk.find('.dk_toggle').outerHeight() - 1
      });
      $dk.toggleClass('dk_open');

      setScrollPos($dk,$dk.find('.dk_option_current'),e); // IE8+ needs to set scrollTop only after the dropdow is opened
      
      $opened = $dk;
    },

    // Set the currently selected option
    setCurrent = function($current, $dk, e) {
      $dk.find('.dk_option_current').removeClass('dk_option_current');
      $current.addClass('dk_option_current');

      setScrollPos($dk, $current, e);
    },

    handleKeyBoardNav = function(e, $dk) {
      var
        code     = e.keyCode,
        data     = $dk.data('dropkick'),
        letter   = String.fromCharCode(code),
        options  = $dk.find('.dk_options'),
        open     = $dk.hasClass('dk_open'),
        lis      = options.find('li'),
        current  = $dk.find('.dk_option_current'),
        first    = lis.first(),
        last     = lis.last(),
        next,
        prev,
        now,
        list,
        i,
        l,
        $a
      ;

      switch (code) {
      case keyMap.enter:
        if (open) {
          if(!current.hasClass('disabled')){
            updateFields(current.find('a'), $dk);
            closeDropdown($dk);
          }
        } else {
          openDropdown($dk,e);
        }
        e.preventDefault();
        break;

      case keyMap.tab:
        if(open){
          updateFields(current.find('a'), $dk);
          closeDropdown($dk);
        }
        break;

      case keyMap.up:
        prev = current.prev('li');
        if (open) {
          if (prev.length) {
            setCurrent(prev, $dk, e);
          } else {
            setCurrent(last, $dk, e);
          }
        } else {
          openDropdown($dk,e);
        }
        e.preventDefault();
        break;

      case keyMap.down:
        if (open) {
          next = current.next('li').first();
          if (next.length) {
            setCurrent(next, $dk, e);
          } else {
            setCurrent(first, $dk, e);
          }
        } else {
          openDropdown($dk,e);
        }
        e.preventDefault();
        break;

      default:
        break;
      }
      //if typing a letter
      if (code >= keyMap.zero && code <= keyMap.z) {
        //update data
        now = new Date().getTime();
        if (data.finder === null) {
          data.finder = letter.toUpperCase();
          data.timer = now;

        }else {
          if (now > parseInt(data.timer, 10) + 1000) {
            data.finder = letter.toUpperCase();
            data.timer =  now;
          } else {
            data.finder = data.finder + letter.toUpperCase();
            data.timer = now;
          }
        }
        //find and switch to the appropriate option
        list = lis.find('a');
        for(i = 0, l = list.length; i < l; i++){
          $a = $(list[i]);
          if ($a.html().toUpperCase().indexOf(data.finder) === 0) {
            updateFields($a, $dk);
            setCurrent($a.parent(), $dk, e);
            break;
          }
        }
        $dk.data('dropkick', data);
      }
    },

    notBlank = function(text) {
      return ($.trim(text).length > 0) ? text : false;
    },

    // Turn the dropdownTemplate into a jQuery object and fill in the variables.
    build = function (tpl, view) {
      var
        // Template for the dropdown
        template  = tpl,
        // Holder of the dropdowns options
        options   = [],
        $dk,
        i,
        l,
        $option,
        current,
        disabled,
        oTemplate
      ;

      template = template.replace('{{ id }}', view.id);
      template = template.replace('{{ label }}', view.label);
      template = template.replace('{{ tabindex }}', view.tabindex);

      if (view.options && view.options.length) {
        for (i = 0, l = view.options.length; i < l; i++) {
          $option   = $(view.options[i]);
          current   = 'dk_option_current';
          disabled  = ' disabled';
          oTemplate = optionTemplate;

          oTemplate = oTemplate.replace('{{ value }}', $option.val());
          oTemplate = oTemplate.replace('{{ current }}', (notBlank($option.val()) === view.value) ? current : '');
          oTemplate = oTemplate.replace('{{ disabled }}', ($option.attr('disabled') !== undefined) ? disabled : '');
          oTemplate = oTemplate.replace('{{ text }}', $option.text());

          options[options.length] = oTemplate;
        }
      }

      $dk = $(template);
      $dk.find('.dk_options_inner').html(options.join(''));

      return $dk;
    }
  ;

  // Help prevent flashes of unstyled content
  if (!ie6) {
    document.documentElement.className = document.documentElement.className + ' dk_fouc';
  }

  // Called by using $('foo').dropkick();
  methods.init = function (settings) {
    settings = $.extend({}, defaults, settings);

    return this.each(function () {
      var
        // The current <select> element
        $select = $(this),

        // Store a reference to the originally selected <option> element
        $original = $select.find(':selected').first(),

        // Save all of the <option> elements
        $options = $select.find('option'),

        // We store lots of great stuff using jQuery data
        data = $select.data('dropkick') || {},

        // This gets applied to the 'dk_container' element
        id = $select.attr('id') || $select.attr('name'),

        // This gets updated to be equal to the longest <option> element
        width  = settings.width || $select.outerWidth(),

        // Check if we have a tabindex set or not set to 0
        tabindex  = $select.attr('tabindex') || '0',

        // The completed dk_container element
        $dk = false,

        theme
      ;
      
      //If its mobile show normal selects
      if (navigator.userAgent.match(/iPad|iPhone|Android|IEMobile|BlackBerry/i)) {
        $('.dk_fouc select').css('top', '0');
        return false;
      }

      // Dont do anything if we've already setup dropkick on this element
      if (data.id) {
        return $select;
      }

      data.settings  = settings;
      data.tabindex  = tabindex;
      data.id        = id;
      data.$original = $original;
      data.$select   = $select;
      data.value     = notBlank($select.val()) || notBlank($original.attr('value'));
      data.label     = $original.text();
      data.options   = $options;

      // Build the dropdown HTML
      $dk = build(dropdownTemplate, data);

      // Make the dropdown fixed width if desired
      $dk.find('.dk_toggle').css({
        'width' : width + 'px'
      });

      // Hide the <select> list and place our new one in front of it
      $select.before($dk);

      // Update the reference to $dk
      $dk = $('div[id="dk_container_' + id + '"]').fadeIn(settings.startSpeed);

      // Save the current theme
      theme = settings.theme || 'default';
      $dk.addClass('dk_theme_' + theme);
      data.theme = theme;

      // Save the updated $dk reference into our data object
      data.$dk = $dk;

      // Save the dropkick data onto the <select> element
      $select.data('dropkick', data);

      //Adds original select classs to dk_container 
      $dk.addClass($select.attr('class')); 

      // Do the same for the dropdown, but add a few helpers
      $dk.data('dropkick', data);

      lists[lists.length] = $select;

      // Focus events
      $dk.bind('focus.dropkick', function () {
        $focused = $dk.addClass('dk_focus');
      }).bind('blur.dropkick', function () {
        $dk.removeClass('dk_focus');
        $focused = null;
      });

      // Sync to change events on the original <select> if requested
      if (data.settings.syncReverse) {
        $select.bind('change', function (e) {
          var value = $select.val(),
              option = $('a[data-dk-dropdown-value="'+value+'"]', $dk),
              label = option.text();
          // updateFields($dkopt, $dk, true, e); // Triggers a resumed updateFilds function
          $dk.find('.dk_label').text(label);
          data.settings.change && data.settings.change.call($select, value, label);
          setCurrent(option.parent(), $dk, e);
        });
      }

      // [Issue #126] Validation do not fires in <select> is not (':visible')
      // setTimeout(function () {
      //   $select.hide();
      // }, 0);
    });
  };

  // Allows dynamic theme changes
  methods.theme = function (newTheme) {
    var
      $select   = $(this),
      list      = $select.data('dropkick'),
      $dk       = list.$dk,
      oldtheme  = 'dk_theme_' + list.theme
    ;

    $dk.removeClass(oldtheme).addClass('dk_theme_' + newTheme);

    list.theme = newTheme;
  };

  // Reset all <selects and dropdowns in our lists array
  methods.reset = function () {
    var
      i,
      l,
      listData,
      $dk,
      $current
    ;
    for (i = 0, l = lists.length; i < l; i++) {
      listData  = lists[i].data('dropkick');
      $dk       = listData.$dk;
      $current  = $dk.find('li').first();

      $dk.find('.dk_label').text(listData.label);
      $dk.find('.dk_options_inner').animate({ scrollTop: 0 }, 0);

      setCurrent($current, $dk, e);
      updateFields($current, $dk, true);
    }
  };

  // Reload / rebuild, in case of dynamic updates etc.
  // Credits to Jeremy (http://stackoverflow.com/users/1380047/jeremy-p)
  methods.reload = function () {
    var 
      $select = $(this),
      data = $select.data('dropkick')
    ;
    $select.removeData("dropkick");
    $("#dk_container_"+ data.id).remove();
    $select.dropkick(data.settings);
  };

  methods.setValue = function (value) {
    var
      $dk = $(this).data('dropkick').$dk,
      $option = $dk.find('.dk_options a[data-dk-dropdown-value="' + value + '"]')
    ;
    updateFields($option, $dk);
    setCurrent($option.parent(), $dk);
  };

  // Regenerating dk wrapper to update it's content
  // http://stackoverflow.com/a/13280151
  methods.refresh = function(){
    return this.each(function () {
      var
        $select   = $(this),
        data      = $select.data('dropkick');

      $select.removeData("dropkick");
      $("#dk_container_"+ data.id).remove();
      $select.dropkick(data.settings);
    });
  };

  // Expose the plugin
  $.fn.dropkick = function (method) {
    if (!ie6) {
      if (methods[method]) {
        return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
      }
      if (typeof method === 'object' || ! method) {
        return methods.init.apply(this, arguments);
      }
    }
  };

  $(function () {

    // Handle click events on individual dropdown options
    $(document).on((msie ? 'mousedown' : 'click'), '.dk_options a', function (e) {
      var
        $option = $(this),
        $dk     = $option.parents('.dk_container').first()
      ;

      if(!$option.parent().hasClass('disabled')){
        updateFields($option, $dk);
        setCurrent($option.parent(), $dk); // IE8+, iOS4 and some Android [4.0] Browsers back to scrollTop 0 when an option is clicked and the dropdown is opened again
        closeDropdown($dk);
      }

      e.preventDefault();
      return false;
    });

    // Setup keyboard nav
    $(document).bind('keydown.dk_nav', function (e) {
      var $dk = null;

      // If we have an open dropdown, key events should get sent to that one
      if ($opened) {
        $dk = $opened;
      } else if ($focused && !$opened) {
        // But if we have no open dropdowns, use the focused dropdown instead
        $dk = $focused;
      }

      if ($dk) {
        handleKeyBoardNav(e, $dk);
      }
    });
    
    // Globally handle a click outside of the dropdown list by closing it.
    $(document).on('click', null, function (e) {
      if ($opened && $(e.target).closest(".dk_container").length == 0 ) {
        closeDropdown($opened); // Improves performance by minimizing DOM Traversal Operations
      } else if ($(e.target).is(".dk_toggle, .dk_label")) {
        var $dk  = $(e.target).parents('.dk_container').first();

        if ($dk.hasClass('dk_open')) {
          closeDropdown($dk);
        } else {
          $opened && closeDropdown($opened);
          openDropdown($dk,e);
        } // Avoids duplication of call to _openDropdown

        if (window.ontouchstart !== undefined) {
          $dk.addClass('dk_touch');
          $dk.find('.dk_options_inner').addClass('scrollable vertical');
        }

        return false;
      }
    });

    // [BEGIN] Prevents window scroll when scrolling  through dk_options, simulating native behaviour
    var startY, //
        wheelSupport =  'onwheel' in window ? 'wheel' : // Modern browsers support "wheel"
                        'onmousewheel' in document ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
                        "MouseScrollEvent" in window ? 'DOMMouseScroll MozMousePixelScroll' : // legacy non-standard event for older Firefox
                        false // lacks support
    ; 

    wheelSupport && $(document).on(wheelSupport, '.dk_options_inner', function(event) {
        var delta = event.originalEvent.wheelDelta || -event.originalEvent.deltaY || -event.originalEvent.detail; // Gets scroll ammount
        if (msie) { this.scrollTop -= Math.round(delta/10); return false; } // Normalize IE behaviour
        return (delta > 0 && this.scrollTop <= 0 ) || (delta < 0 && this.scrollTop >= this.scrollHeight - this.offsetHeight ) ? false : true; // Finally cancels page scroll when nedded
    });
  });

}(jQuery, window, document));