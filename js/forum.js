'use strict';

var qrModal = require('./qrModal');

(function () {
  app.initializers.add('linkrobins/referral', function () {
    var extend = flarum.reg.get('core', 'common/extend').extend;
    var override = flarum.reg.get('core', 'common/extend').override;
    var Model = flarum.reg.get('core', 'common/Model');
    var UserPage = flarum.reg.get('core', 'forum/components/UserPage');
    var LinkButton = flarum.reg.get('core', 'common/components/LinkButton');
    var Link = flarum.reg.get('core', 'common/components/Link');
    var LoadingIndicator = flarum.reg.get('core', 'common/components/LoadingIndicator');
    var UserPageResolver = flarum.reg.get('core', 'forum/resolvers/UserPageResolver');

    var UserModel = app.store.models['users'];
    if (UserModel) {
      UserModel.prototype.referralCount = Model.attribute('referralCount');
      UserModel.prototype.referralCode = Model.attribute('referralCode');
      UserModel.prototype.referralEligible = Model.attribute('referralEligible');
      UserModel.prototype.referredBy = Model.hasOne('referredBy');
      UserModel.prototype.referredUsers = Model.hasMany('referredUsers');
    }

    (function () {
      try {
        var urlCode = (new URLSearchParams(window.location.search).get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (urlCode) {
          localStorage.setItem('referral_pending_code', urlCode);
        }
      } catch (e) {
        // Best-effort storage write (private mode / disabled storage); safe to ignore.
      }
    })();

    // The link a new member follows: the private-facade sign-up page when
    // that extension provides one, else the forum root (the ?ref capture
    // above runs on any page).
    function inviteUrl(code) {
      var base = app.routes['sycho-private-facade.signup'] ? app.route('sycho-private-facade.signup') : '/';
      return window.location.origin + base + '?ref=' + encodeURIComponent(code);
    }

    function getRefFromUrl() {
      try {
        var urlCode = (new URLSearchParams(window.location.search).get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (urlCode) return urlCode;
        return (localStorage.getItem('referral_pending_code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      } catch (e) {
        return '';
      }
    }

    function extendSignUpModal(SignUpModal) {
      if (!SignUpModal || SignUpModal._referralExtended) return;
      SignUpModal._referralExtended = true;

      extend(SignUpModal.prototype, 'fields', function (items) {
        var self = this;
        var required = app.forum && app.forum.attribute('referralRequired');
        if (self._inviteCode === undefined) self._inviteCode = getRefFromUrl();

        items.add(
          'inviteCode',
          m(
            'div',
            { className: 'Form-group' },
            m(
              'label',
              required
                ? app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label_required')
                : app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label')
            ),
            m('input', {
              className: 'FormControl ReferralSignup-codeInput',
              name: 'inviteCode',
              type: 'text',
              placeholder: app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_placeholder'),
              value: self._inviteCode,
              oninput: function (e) {
                self._inviteCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                e.target.value = self._inviteCode;
              },
              required: required || false,
            })
          ),
          5
        );
      });

      override(SignUpModal.prototype, 'onsubmit', function (original, e) {
        var code = this._inviteCode && this._inviteCode.trim();
        // Only mark the cookie Secure over HTTPS so it isn't dropped on
        // plain-HTTP dev forums, but is never sent in cleartext on HTTPS.
        var secure = window.location.protocol === 'https:' ? '; Secure' : '';
        if (code) {
          var expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
          document.cookie = 'referral_code=' + encodeURIComponent(code) + '; expires=' + expires + '; path=/; SameSite=Lax' + secure;
        } else {
          document.cookie = 'referral_code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax' + secure;
        }
        try {
          localStorage.removeItem('referral_pending_code');
        } catch (e) {}
        return original(e);
      });
    }

    var SignUpModalNow = flarum.reg.checkModule && flarum.reg.checkModule('core', 'forum/components/SignUpModal');
    if (SignUpModalNow) extendSignUpModal(SignUpModalNow);
    flarum.reg.onLoad('core', 'forum/components/SignUpModal', extendSignUpModal);

    var SignUpSectionNow = flarum.reg.checkModule && flarum.reg.checkModule('sycho-private-facade', 'forum/components/SignUpSection');
    if (SignUpSectionNow) extendSignUpModal(SignUpSectionNow);
    flarum.reg.onLoad('sycho-private-facade', 'forum/components/SignUpSection', extendSignUpModal);

    class ReferralsPage extends UserPage {
      oninit(vnode) {
        super.oninit(vnode);
        this.loadUser(m.route.param('username'));
      }

      content() {
        const user = this.user;
        const isOwn = app.session && app.session.user && app.session.user.id() === user.id();
        const count = user.referralCount ? user.referralCount() : 0;
        const code = user.referralCode ? user.referralCode() : '';
        const eligible = user.referralEligible ? user.referralEligible() : false;

        // Generation is a write, so it no longer happens during GET
        // serialization. When an eligible owner opens their tab without
        // a code yet, request one (once) from the explicit endpoint and
        // store it on the model so it renders.
        if (isOwn && eligible && !code && !this._generating) {
          this._generating = true;
          var apiUrl = (app.forum && app.forum.attribute('apiUrl')) || '/api';
          app
            .request({ method: 'POST', url: apiUrl + '/referral/my-code' })
            .then((res) => {
              const newCode = res && res.data && res.data.code;
              if (newCode) user.pushAttributes({ referralCode: newCode });
              m.redraw();
            })
            .catch(() => {
              m.redraw();
            });
        }

        return m(
          'div',
          { className: 'ReferralProfile' },

          // Not eligible under the admin rules: no code is offered.
          isOwn &&
            !eligible &&
            m(
              'div',
              { className: 'ReferralProfile-section' },
              m('h3', { className: 'ReferralProfile-heading' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
              m('p', { className: 'ReferralProfile-note' }, app.translator.trans('linkrobins-referral.forum.profile.not_eligible'))
            ),

          // Eligible but the code is still being generated.
          isOwn &&
            eligible &&
            !code &&
            m(
              'div',
              { className: 'ReferralProfile-section' },
              m('h3', { className: 'ReferralProfile-heading' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
              m(LoadingIndicator, { display: 'inline', size: 'small' })
            ),

          isOwn &&
            eligible &&
            code &&
            m(
              'div',
              { className: 'ReferralProfile-section' },
              m('h3', { className: 'ReferralProfile-heading' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
              m('p', { className: 'ReferralProfile-help' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_help')),
              m(
                'div',
                { className: 'ReferralProfile-codeRow' },
                m('div', { className: 'ReferralProfile-code' }, code),
                m(
                  'button',
                  {
                    className: 'Button Button--primary',
                    type: 'button',
                    onclick: function () {
                      navigator.clipboard && navigator.clipboard.writeText(code);
                    },
                  },
                  app.translator.trans('linkrobins-referral.forum.profile.copy')
                ),
                m(
                  'button',
                  {
                    className: 'Button Button--default',
                    type: 'button',
                    onclick: function () {
                      navigator.clipboard && navigator.clipboard.writeText(inviteUrl(code));
                    },
                  },
                  app.translator.trans('linkrobins-referral.forum.profile.copy_link')
                ),
                m(
                  'button',
                  {
                    className: 'Button Button--default',
                    type: 'button',
                    onclick: function () {
                      qrModal.show(inviteUrl(code), code);
                    },
                  },
                  m('i', { className: 'icon fas fa-qrcode Button-icon', 'aria-hidden': 'true' }),
                  ' ',
                  app.translator.trans('linkrobins-referral.forum.profile.qr_button')
                )
              )
            ),

          m(
            'div',
            m('h3', { className: 'ReferralProfile-totalHeading' }, app.translator.trans('linkrobins-referral.forum.profile.total_referrals')),
            m('p', { className: 'ReferralProfile-count' }, count),
            count === 0 && m('p', { className: 'ReferralProfile-empty' }, app.translator.trans('linkrobins-referral.forum.profile.no_referrals'))
          )
        );
      }
    }

    app.routes['user.referrals'] = {
      path: '/u/:username/referrals',
      component: ReferralsPage,
      resolverClass: UserPageResolver,
    };

    extend(UserPage.prototype, 'navItems', function (items) {
      if (!this.user) return;
      const count = this.user.referralCount ? this.user.referralCount() : 0;
      items.add(
        'referrals',
        m(
          LinkButton,
          {
            href: app.route('user.referrals', { username: this.user.username() }),
            icon: 'fas fa-user-check',
          },
          app.translator.trans('linkrobins-referral.forum.profile.tab'),
          count > 0 &&
            m(
              'span',
              {
                className: 'Button-badge',
              },
              count
            )
        ),
        10
      );
    });

    // ---- "Someone joined with your invite code" notification ------------
    var NOTIFICATION_TYPE = 'linkrobinsReferralRegistered';

    function installNotificationComponent(Notification) {
      if (!Notification || Notification._referralExtended) return;
      Notification._referralExtended = true;

      class ReferralRegisteredNotification extends Notification {
        icon() {
          return 'fas fa-user-check';
        }
        href() {
          var subject = this.attrs.notification.subject();
          return subject ? app.route('user', { username: subject.slug ? subject.slug() : subject.username() }) : '#';
        }
        content() {
          var from = this.attrs.notification.fromUser && this.attrs.notification.fromUser();
          var name = from && from.displayName ? from.displayName() : app.translator.trans('linkrobins-referral.forum.notifications.someone');
          return app.translator.trans('linkrobins-referral.forum.notifications.registered_text', { name: name });
        }
        excerpt() {
          return '';
        }
      }

      app.notificationComponents[NOTIFICATION_TYPE] = ReferralRegisteredNotification;
    }

    var NotificationNow = flarum.reg.checkModule && flarum.reg.checkModule('core', 'forum/components/Notification');
    if (NotificationNow) installNotificationComponent(NotificationNow);
    flarum.reg.onLoad('core', 'forum/components/Notification', installNotificationComponent);

    // NotificationGrid lives in a lazily-loaded chunk, so it isn't in the
    // registry at init time. The string-path form of extend() defers
    // resolution until the module actually loads.
    extend('flarum/forum/components/NotificationGrid', 'notificationTypes', function (items) {
      items.add(NOTIFICATION_TYPE, {
        name: NOTIFICATION_TYPE,
        icon: 'fas fa-user-check',
        label: app.translator.trans('linkrobins-referral.forum.settings.notify_registered_label'),
      });
    });

    // Core's NotificationList groups notifications by discussion and lumps
    // anything not tied to one (like this type) into a neutral group labelled
    // with the forum title. There's no per-type hook, so content() is
    // reimplemented to route referral notifications into their own
    // "Referrals" group while leaving all other grouping untouched.
    function installNotificationGrouping(NotificationList) {
      if (!NotificationList || NotificationList._referralExtended) return;
      NotificationList._referralExtended = true;

      override(NotificationList.prototype, 'content', function (original, state) {
        if (state.isLoading() || !state.hasItems()) return null;

        var HeaderListGroup = flarum.reg.get('core', 'forum/components/HeaderListGroup');
        var NotificationType = flarum.reg.get('core', 'forum/components/NotificationType');
        var Discussion = flarum.reg.get('core', 'common/models/Discussion');
        var listItems = flarum.reg.get('core', 'common/helpers/listItems');

        return state.getPages().map(function (page) {
          var groups = [];
          var byKey = {};

          page.items.forEach(function (notification) {
            var subject = notification.subject();
            if (typeof subject === 'undefined') return;

            var contentType = notification.contentType && notification.contentType();
            var isReferral = contentType === NOTIFICATION_TYPE;

            // Mirror core's discussion resolution for everything else.
            var discussion = null;
            if (!isReferral) {
              if (Discussion && subject instanceof Discussion) discussion = subject;
              else if (subject && subject.discussion) discussion = subject.discussion();
            }

            var key = isReferral ? 'linkrobins-referral' : discussion ? 'd' + discussion.id() : 'neutral';

            byKey[key] = byKey[key] || { discussion: discussion, referral: isReferral, notifications: [] };
            byKey[key].notifications.push(notification);
            if (groups.indexOf(byKey[key]) === -1) groups.push(byKey[key]);
          });

          return groups.map(function (group) {
            var label;
            if (group.referral) {
              label = app.translator.trans('linkrobins-referral.forum.notifications.group_label');
            } else if (group.discussion) {
              var badges = group.discussion.badges().toArray();
              label = m(Link, { href: app.route.discussion(group.discussion) }, [
                badges && badges.length ? m('ul', { className: 'HeaderListGroup-badges badges' }, listItems(badges)) : null,
                m('span', null, group.discussion.title()),
              ]);
            } else {
              label = app.forum.attribute('title');
            }

            return m(
              HeaderListGroup,
              { label: label },
              group.notifications.map(function (notification) {
                return m(NotificationType, { notification: notification });
              })
            );
          });
        });
      });
    }

    var NotificationListNow = flarum.reg.checkModule && flarum.reg.checkModule('core', 'forum/components/NotificationList');
    if (NotificationListNow) installNotificationGrouping(NotificationListNow);
    flarum.reg.onLoad('core', 'forum/components/NotificationList', installNotificationGrouping);

    flarum.reg.onLoad('core', 'forum/components/UserCard', function (UserCard) {
      if (!UserCard) return;
      extend(UserCard.prototype, 'infoItems', function (items) {
        const user = this.attrs.user;
        const count = user && user.referralCount ? user.referralCount() : 0;
        if (!count) return;
        items.add(
          'referralCount',
          m(
            'div',
            { className: 'ReferralCard-info' },
            m('i', { className: 'icon fas fa-user-check ReferralCard-icon' }),
            m(
              'span',
              { className: 'ReferralCard-text' },
              app.translator.trans(
                count === 1 ? 'linkrobins-referral.forum.user_card.referrals_singular' : 'linkrobins-referral.forum.user_card.referrals_plural',
                { count: count }
              )
            )
          ),
          5
        );
      });
    });
  });
})();
