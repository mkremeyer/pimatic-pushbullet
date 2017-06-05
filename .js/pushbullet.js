var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

module.exports = function(env) {
  var M, Promise, PushBullet, PushbulletActionHandler, PushbulletActionProvider, PushbulletPlugin, PushbulletPredicateProvider, assert, plugin, pusherService, util;
  Promise = env.require('bluebird');
  assert = env.require('cassert');
  util = env.require('util');
  M = env.matcher;
  PushBullet = require('pushbullet');
  Promise.promisifyAll(PushBullet.prototype);
  pusherService = null;
  PushbulletPlugin = (function(superClass) {
    extend(PushbulletPlugin, superClass);

    function PushbulletPlugin() {
      this.init = bind(this.init, this);
      return PushbulletPlugin.__super__.constructor.apply(this, arguments);
    }

    PushbulletPlugin.prototype.init = function(app, framework, config) {
      var apikey;
      this.framework = framework;
      apikey = config.apikey;
      env.logger.debug("apikey= " + apikey);
      pusherService = new PushBullet(apikey);
      this.framework.ruleManager.addActionProvider(new PushbulletActionProvider(this.framework, config));
      return this.framework.ruleManager.addPredicateProvider(new PushbulletPredicateProvider(this.framework));
    };

    return PushbulletPlugin;

  })(env.plugins.Plugin);
  plugin = new PushbulletPlugin();
  PushbulletActionProvider = (function(superClass) {
    extend(PushbulletActionProvider, superClass);

    function PushbulletActionProvider(framework, config1) {
      this.framework = framework;
      this.config = config1;
      this.parseAction = bind(this.parseAction, this);
      return;
    }

    PushbulletActionProvider.prototype.parseAction = function(input, context) {
      var defaultDevice, defaultMessage, defaultTitle, defaultType, device, m, match, messageTokens, next, setChannel, setMessage, setTitle, setType, strToTokens, titleTokens, tokensToStr, typeTokens;
      defaultTitle = this.config.title;
      defaultMessage = this.config.message;
      defaultDevice = this.config.device;
      defaultType = this.config.type;
      if (this.config.channeltag !== "") {
        defaultDevice = {
          channel_tag: this.config.channeltag
        };
      }
      strToTokens = (function(_this) {
        return function(str) {
          return ["\"" + str + "\""];
        };
      })(this);
      tokensToStr = (function(_this) {
        return function(tokens) {
          return tokens[0].replace(/\'|\"/g, "");
        };
      })(this);
      titleTokens = strToTokens(defaultTitle);
      messageTokens = strToTokens(defaultMessage);
      typeTokens = strToTokens(defaultType);
      device = defaultDevice;
      setTitle = (function(_this) {
        return function(m, tokens) {
          return titleTokens = tokens;
        };
      })(this);
      setMessage = (function(_this) {
        return function(m, tokens) {
          return messageTokens = tokens;
        };
      })(this);
      setType = (function(_this) {
        return function(m, tokens) {
          return typeTokens = tokens;
        };
      })(this);
      setChannel = (function(_this) {
        return function(m, tokens) {
          return device = {
            channel_tag: tokensToStr(tokens)
          };
        };
      })(this);
      m = M(input, context).match('send ', {
        optional: true
      }).match(['push', 'pushbullet', 'notification']);
      next = m.match(' title:').matchStringWithVars(setTitle);
      if (next.hadMatch()) {
        m = next;
      }
      next = m.match(' message:').matchStringWithVars(setMessage);
      if (next.hadMatch()) {
        m = next;
      }
      next = m.match(' type:').matchStringWithVars(setType);
      if (next.hadMatch()) {
        m = next;
      }
      next = m.match(' channel:').matchStringWithVars(setChannel);
      if (next.hadMatch()) {
        m = next;
      }
      if (m.hadMatch()) {
        match = m.getFullMatch();
        assert(Array.isArray(titleTokens));
        assert(Array.isArray(messageTokens));
        assert(Array.isArray(typeTokens));
        return {
          token: match,
          nextInput: input.substring(match.length),
          actionHandler: new PushbulletActionHandler(this.framework, titleTokens, messageTokens, typeTokens, device)
        };
      }
    };

    return PushbulletActionProvider;

  })(env.actions.ActionProvider);
  PushbulletActionHandler = (function(superClass) {
    extend(PushbulletActionHandler, superClass);

    function PushbulletActionHandler(framework, titleTokens1, messageTokens1, typeTokens1, device1) {
      this.framework = framework;
      this.titleTokens = titleTokens1;
      this.messageTokens = messageTokens1;
      this.typeTokens = typeTokens1;
      this.device = device1;
    }

    PushbulletActionHandler.prototype.executeAction = function(simulate, context) {
      return Promise.all([this.framework.variableManager.evaluateStringExpression(this.titleTokens), this.framework.variableManager.evaluateStringExpression(this.messageTokens), this.framework.variableManager.evaluateStringExpression(this.typeTokens)]).then((function(_this) {
        return function(arg) {
          var e, message, title, type;
          title = arg[0], message = arg[1], type = arg[2];
          switch (type) {
            case "file":
              if (simulate) {
                return __("would send file \"%s\" with title \"%s\"", message, title);
              } else {
                try {
                  return pusherService.fileAsync(_this.device, message, title).then(function() {
                    return __("pushbullet file sent successfully");
                  });
                } catch (error) {
                  e = error;
                  if (e.code === "ENOENT") {
                    return __("File not found!");
                  }
                }
              }
              break;
            case "note":
              if (simulate) {
                return __("would push message \"%s\" with title \"%s\"", message, title);
              } else {
                return pusherService.noteAsync(_this.device, title, message).then(function() {
                  return __("pushbullet message sent successfully");
                });
              }
          }
        };
      })(this));
    };

    return PushbulletActionHandler;

  })(env.actions.ActionHandler);
  PushbulletPredicateProvider = (function(superClass) {
    extend(PushbulletPredicateProvider, superClass);

    PushbulletPredicateProvider.prototype.presets = [
      {
        name: "PushBullet Message",
        input: "push Hello World"
      }
    ];

    function PushbulletPredicateProvider(framework) {
      this.framework = framework;
    }

    PushbulletPredicateProvider.prototype.parsePredicate = function(input, context) {
      var fullMatch, m, message, setMessage;
      env.logger.info("-------------------------");
      message = null;
      setMessage = (function(_this) {
        return function(m, match) {
          message = match;
          return env.logger.info("moinsen");
        };
      })(this);
      m = M(input, context).match('push ').matchString(setMessage);
      env.logger.info(input);
      env.logger.info("had match? " + m.hadMatch());
      env.logger.info("full match: " + m.getFullMatch());
      if (m.hadMatch()) {
        fullMatch = m.getFullMatch();
        env.logger.info("message: " + message);
        return {
          token: fullMatch,
          nextInput: input.substring(fullMatch.length),
          predicateHandler: new PushbulletPredicateHandler(message)
        };
      } else {
        return null;
      }
    };

    return PushbulletPredicateProvider;

  })(env.predicates.PredicateProvider);
  module.exports.PushbulletActionHandler = PushbulletActionHandler;
  return plugin;
};
