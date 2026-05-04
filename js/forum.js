'use strict';

(function () {



    app.initializers.add('linkrobins/referral', function () {

        var extend       = flarum.reg.get('core', 'common/extend').extend;
        var Model        = flarum.reg.get('core', 'common/Model');
        var UserPage     = flarum.reg.get('core', 'forum/components/UserPage');
        var LinkButton   = flarum.reg.get('core', 'common/components/LinkButton');
        var Link         = flarum.reg.get('core', 'common/components/Link');
        var Avatar       = flarum.reg.get('core', 'common/components/Avatar');
        var humanTime    = flarum.reg.get('core', 'common/helpers/humanTime');
        var Notification = flarum.reg.get('core', 'forum/components/Notification');
        var UserPageResolver = flarum.reg.get('core', 'forum/resolvers/UserPageResolver');

        var UserModel = app.store.models['users'];
        if (UserModel) {
            UserModel.prototype.referralCount = Model.attribute('referralCount');
            UserModel.prototype.referralCode  = Model.attribute('referralCode');
            UserModel.prototype.referredBy    = Model.hasOne('referredBy');
            UserModel.prototype.referredUsers = Model.hasMany('referredUsers');
            UserModel.prototype.joinTime      = Model.attribute('joinTime', Model.transformDate);
        }

        function extendSignUpModal(SignUpModal) {
            if (!SignUpModal || SignUpModal._referralExtended) return;
            SignUpModal._referralExtended = true;

            extend(SignUpModal.prototype, 'fields', function (items) {
                var self     = this;
                var required = app.forum && app.forum.attribute('referralRequired');
                if (self._inviteCode === undefined) self._inviteCode = '';

                items.add('inviteCode',
                    m('div', { className: 'Form-group' },
                        m('label', required ? app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label_required') : app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label')),
                        m('input', {
                            className: 'FormControl',
                            type: 'text',
                            placeholder: app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_placeholder'),
                            value: self._inviteCode,
                            style: 'text-transform:uppercase;letter-spacing:3px;font-family:monospace;',
                            oninput: function (e) {
                                self._inviteCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                e.target.value = self._inviteCode;
                            },
                            required: required || false,
                        })
                    ),
                    -5
                );
            });

            extend(SignUpModal.prototype, 'onsubmit', function (e) {
                var code = this._inviteCode && this._inviteCode.trim();
                if (code) {
                    var expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString(); // 10 min
                    document.cookie = 'referral_code=' + encodeURIComponent(code)
                        + '; expires=' + expires + '; path=/; SameSite=Lax';
                }
            });
        }

        var SignUpModalNow = flarum.reg.checkModule && flarum.reg.checkModule('core', 'forum/components/SignUpModal');
        if (SignUpModalNow) extendSignUpModal(SignUpModalNow);
        flarum.reg.onLoad('core', 'forum/components/SignUpModal', extendSignUpModal);

        class ReferralsPage extends UserPage {
            oninit(vnode) {
                super.oninit(vnode);
                this.loadUser(m.route.param('username'));
            }

            content() {
                const user    = this.user;
                const isOwn   = app.session && app.session.user && app.session.user.id() === user.id();
                const count   = user.referralCount ? user.referralCount() : 0;
                const code    = user.referralCode  ? user.referralCode()  : '';

                return m('div', { style: 'padding:0 16px;' },

                    isOwn && m('div', { style: 'margin-bottom:24px;' },
                        m('h3', { style: 'font-size:1rem;font-weight:700;margin-bottom:4px;' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
                        m('p', { style: 'font-size:.85rem;color:var(--muted-color);margin-bottom:8px;' },
                            app.translator.trans('linkrobins-referral.forum.profile.invite_code_help')
                        ),
                        m('div', { style: 'display:flex;align-items:center;gap:12px;' },
                            m('div', {
                                style: 'font-size:1.75rem;font-weight:800;letter-spacing:6px;background:var(--control-bg);padding:12px 24px;border-radius:var(--border-radius,4px);font-family:monospace;color:var(--primary-color);'
                            }, code),
                            m('button', {
                                className: 'Button Button--primary',
                                type: 'button',
                                onclick: function () { navigator.clipboard && navigator.clipboard.writeText(code); }
                            }, app.translator.trans('linkrobins-referral.forum.profile.copy'))
                        )
                    ),

                    m('div',
                        m('h3', { style: 'font-size:1rem;font-weight:700;margin-bottom:8px;' }, app.translator.trans('linkrobins-referral.forum.profile.total_referrals')),
                        m('p', { style: 'font-size:2rem;font-weight:800;color:var(--primary-color);' }, count),
                        count === 0 && m('p', { style: 'color:var(--muted-color);font-size:.9rem;margin-top:4px;' },
                            app.translator.trans('linkrobins-referral.forum.profile.no_referrals')
                        )
                    )
                );
            }
        }

        class UserReferredNotification extends Notification {
            icon() { return 'fas fa-user-check'; }
            href() {
                const from = this.attrs.notification.fromUser();
                return from ? app.route.user(from) : '#';
            }
            content() {
                const from = this.attrs.notification.fromUser();
                return app.translator.trans('linkrobins-referral.forum.notification.user_referred').replace('{displayName}', from ? from.displayName() : '');
            }
            excerpt() { return ''; }
        }

        app.routes['user.referrals'] = {
            path: '/u/:username/referrals',
            component: ReferralsPage,
            resolverClass: UserPageResolver,
        };

        app.notificationComponents.referral_user_referred = UserReferredNotification;

        extend(UserPage.prototype, 'navItems', function (items) {
            if (!this.user) return;
            const count = this.user.referralCount ? this.user.referralCount() : 0;
            items.add('referrals',
                m(LinkButton, {
                    href: app.route('user.referrals', { username: this.user.username() }),
                    icon: 'fas fa-user-check',
                },
                    app.translator.trans('linkrobins-referral.forum.profile.tab'),
                    count > 0 && m('span', {
                        className: 'Button-badge'
                    }, count)
                ),
                10
            );
        });

        flarum.reg.onLoad('core', 'forum/components/UserCard', function (UserCard) {
            if (!UserCard) return;
            extend(UserCard.prototype, 'infoItems', function (items) {
                const user  = this.attrs.user;
                const count = user && user.referralCount ? user.referralCount() : 0;
                if (!count) return;
                items.add('referralCount',
                    m('div', { style: 'display:flex;align-items:center;gap:6px;' },
                        m('i', { className: 'icon fas fa-user-check', style: 'color:var(--primary-color);' }),
                        m('span', { style: 'font-weight:600;' }, count + (count === 1 ? ' referral' : ' referrals'))
                    ),
                    5
                );
            });
        });

    });

})();

module.exports = {};
