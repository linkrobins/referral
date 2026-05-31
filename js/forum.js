'use strict';

(function () {



    app.initializers.add('linkrobins/referral', function () {

        var extend       = flarum.reg.get('core', 'common/extend').extend;
        var override     = flarum.reg.get('core', 'common/extend').override;
        var Model        = flarum.reg.get('core', 'common/Model');
        var UserPage     = flarum.reg.get('core', 'forum/components/UserPage');
        var LinkButton   = flarum.reg.get('core', 'common/components/LinkButton');
        var Link         = flarum.reg.get('core', 'common/components/Link');
        var Avatar       = flarum.reg.get('core', 'common/components/Avatar');
        var humanTime    = flarum.reg.get('core', 'common/helpers/humanTime');
        var UserPageResolver = flarum.reg.get('core', 'forum/resolvers/UserPageResolver');

        var UserModel = app.store.models['users'];
        if (UserModel) {
            UserModel.prototype.referralCount    = Model.attribute('referralCount');
            UserModel.prototype.referralCode     = Model.attribute('referralCode');
            UserModel.prototype.referralEligible = Model.attribute('referralEligible');
            UserModel.prototype.referredBy    = Model.hasOne('referredBy');
            UserModel.prototype.referredUsers = Model.hasMany('referredUsers');
            UserModel.prototype.joinTime      = Model.attribute('joinTime', Model.transformDate);
        }


        (function () {
            try {
                var urlCode = (new URLSearchParams(window.location.search).get('ref') || '')
                    .toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (urlCode) {
                    localStorage.setItem('referral_pending_code', urlCode);
                }
            } catch (e) {
                // Best-effort storage write (private mode / disabled storage); safe to ignore.
            }
        })();

        function getRefFromUrl() {
            try {
                var urlCode = (new URLSearchParams(window.location.search).get('ref') || '')
                    .toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (urlCode) return urlCode;
                return (localStorage.getItem('referral_pending_code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            } catch (e) { return ''; }
        }

        function extendSignUpModal(SignUpModal) {
            if (!SignUpModal || SignUpModal._referralExtended) return;
            SignUpModal._referralExtended = true;

            extend(SignUpModal.prototype, 'fields', function (items) {
                var self     = this;
                var required = app.forum && app.forum.attribute('referralRequired');
                if (self._inviteCode === undefined) self._inviteCode = getRefFromUrl();

                items.add('inviteCode',
                    m('div', { className: 'Form-group' },
                        m('label', required
                            ? app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label_required')
                            : app.translator.trans('linkrobins-referral.forum.sign_up.invite_code_label')),
                        m('input', {
                            className: 'FormControl',
                            name: 'inviteCode',
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
                    document.cookie = 'referral_code=' + encodeURIComponent(code)
                        + '; expires=' + expires + '; path=/; SameSite=Lax' + secure;
                } else {
                    document.cookie = 'referral_code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax' + secure;
                }
                try { localStorage.removeItem('referral_pending_code'); } catch (e) {}
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
                const user    = this.user;
                const isOwn   = app.session && app.session.user && app.session.user.id() === user.id();
                const count   = user.referralCount ? user.referralCount() : 0;
                const code    = user.referralCode  ? user.referralCode()  : '';

                return m('div', { style: 'padding:0 16px;' },

                    // Owner with no code = not eligible under the admin rules.
                    isOwn && !code && m('div', { style: 'margin-bottom:24px;' },
                        m('h3', { style: 'font-size:1rem;font-weight:700;margin-bottom:4px;' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
                        m('p', { style: 'font-size:.85rem;color:var(--muted-color);' },
                            app.translator.trans('linkrobins-referral.forum.profile.not_eligible')
                        )
                    ),

                    isOwn && code && m('div', { style: 'margin-bottom:24px;' },
                        m('h3', { style: 'font-size:1rem;font-weight:700;margin-bottom:4px;' }, app.translator.trans('linkrobins-referral.forum.profile.invite_code_title')),
                        m('p', { style: 'font-size:.85rem;color:var(--muted-color);margin-bottom:8px;' },
                            app.translator.trans('linkrobins-referral.forum.profile.invite_code_help')
                        ),
                        m('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;' },
                            m('div', {
                                style: 'font-size:1.75rem;font-weight:800;letter-spacing:6px;background:var(--control-bg);padding:12px 24px;border-radius:var(--border-radius,4px);font-family:monospace;color:var(--primary-color);'
                            }, code),
                            m('button', {
                                className: 'Button Button--primary',
                                type: 'button',
                                onclick: function () { navigator.clipboard && navigator.clipboard.writeText(code); }
                            }, app.translator.trans('linkrobins-referral.forum.profile.copy')),
                            m('button', {
                                className: 'Button Button--default',
                                type: 'button',
                                onclick: function () {

                                    var base = app.routes['sycho-private-facade.signup']
                                        ? app.route('sycho-private-facade.signup')
                                        : '/';
                                    var url = window.location.origin + base + '?ref=' + encodeURIComponent(code);
                                    navigator.clipboard && navigator.clipboard.writeText(url);
                                }
                            }, app.translator.trans('linkrobins-referral.forum.profile.copy_link'))
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

        app.routes['user.referrals'] = {
            path: '/u/:username/referrals',
            component: ReferralsPage,
            resolverClass: UserPageResolver,
        };


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
                        m('span', { style: 'font-weight:600;' }, app.translator.trans(
                            count === 1
                                ? 'linkrobins-referral.forum.user_card.referrals_singular'
                                : 'linkrobins-referral.forum.user_card.referrals_plural',
                            { count: count }
                        ))
                    ),
                    5
                );
            });
        });

    });

})();
