'use strict';

app.initializers.add('linkrobins/referral-admin', function () {
    var ExtensionPage     = flarum.reg.get('core', 'admin/components/ExtensionPage');
    var saveSettings      = flarum.reg.get('core', 'admin/utils/saveSettings');
    var FieldSet          = flarum.reg.get('core', 'common/components/FieldSet');
    var Switch            = flarum.reg.get('core', 'common/components/Switch');
    var Button            = flarum.reg.get('core', 'common/components/Button');
    var LoadingIndicator  = flarum.reg.get('core', 'common/components/LoadingIndicator');

    function apiBase() {
        return (app.forum && app.forum.attribute('apiUrl')) || '/api';
    }

    // A dedicated settings page registered for this extension only, instead of
    // overriding the shared ExtensionPage.prototype.content (which ran for every
    // extension's admin page and early-returned). The admin route resolver swaps
    // this in when /extension/linkrobins-referral is opened.
    class ReferralSettingsPage extends ExtensionPage {
        content() {
        var self = this;

        function setting(key) {
            return app.data.settings['linkrobins-referral.' + key];
        }
        function saveSetting(key, value) {
            app.data.settings['linkrobins-referral.' + key] = value;
            var body = {};
            body['linkrobins-referral.' + key] = value;
            return saveSettings(body);
        }
        function trans(key, args) {
            return app.translator.trans('linkrobins-referral.admin.' + key, args);
        }
        function help(text) {
            return m('p', { className: 'helpText ReferralAdmin-help' }, text);
        }

        // ---- Load campaign codes once ----
        if (self._refCodes === undefined && !self._refCodesLoading) {
            self._refCodesLoading = true;
            app.request({ method: 'GET', url: apiBase() + '/referral/campaign-codes' })
                .then(function (res) { self._refCodes = (res && res.data) || []; self._refCodesLoading = false; m.redraw(); })
                .catch(function () { self._refCodes = []; self._refCodesLoading = false; m.redraw(); });
        }

        // ---- Load groups once (for the eligibility picker) ----
        var groups = app.store.all('groups').filter(function (g) {
            // Exclude the virtual Guest (2) and Member (3) groups.
            return g.id() !== '2' && g.id() !== '3';
        });
        if (!groups.length && !self._refGroupsReq) {
            self._refGroupsReq = true;
            app.store.find('groups').then(m.redraw);
        }

        var selectedGroups;
        try { selectedGroups = JSON.parse(setting('eligibility_groups') || '[]'); } catch (e) { selectedGroups = []; }
        selectedGroups = (selectedGroups || []).map(String);

        function toggleGroup(id) {
            id = String(id);
            var idx = selectedGroups.indexOf(id);
            if (idx === -1) selectedGroups.push(id); else selectedGroups.splice(idx, 1);
            saveSetting('eligibility_groups', JSON.stringify(selectedGroups.map(Number))).then(m.redraw);
        }

        var requireOn = setting('require_referral') === '1';

        // ---- Campaign code create / delete ----
        function createCode() {
            var label  = (self._refNewLabel || '').trim();
            var expiry = self._refNewExpiry || '';
            var attrs  = {};
            if (label)  attrs.label = label;
            if (expiry) attrs.expiresAt = new Date(expiry + 'T23:59:59').toISOString();

            self._refCreating = true; m.redraw();
            app.request({ method: 'POST', url: apiBase() + '/referral/campaign-codes', body: { data: { attributes: attrs } } })
                .then(function (res) {
                    self._refCodes = [res.data].concat(self._refCodes || []);
                    self._refNewLabel = '';
                    self._refNewExpiry = '';
                    self._refCreating = false;
                    m.redraw();
                })
                .catch(function () { self._refCreating = false; m.redraw(); });
        }

        function deleteCode(id) {
            if (!confirm(trans('campaign.confirm_delete'))) return;
            self._refDeleting = id; m.redraw();
            app.request({ method: 'DELETE', url: apiBase() + '/referral/campaign-codes/' + id })
                .then(function () {
                    self._refCodes = (self._refCodes || []).filter(function (c) { return c.id !== id; });
                    self._refDeleting = null;
                    m.redraw();
                })
                .catch(function () { self._refDeleting = null; m.redraw(); });
        }

        function numberInput(key) {
            return m('input', {
                className: 'FormControl ReferralAdmin-numberInput',
                type: 'number',
                min: '0',
                value: setting(key) || '0',
                onchange: function (e) {
                    saveSetting(key, String(Math.max(0, parseInt(e.target.value, 10) || 0)));
                },
            });
        }

        // ===== General =====
        var generalSection = m(FieldSet, { label: trans('settings.title') },
            m('div', null,
                m(Switch, {
                    state: requireOn,
                    onchange: function (val) { saveSetting('require_referral', val ? '1' : '0').then(m.redraw); },
                }, trans('settings.require_label')),
                help(trans('settings.require_help'))
            )
        );

        // ===== Eligibility =====
        var eligibilitySection = m(FieldSet, { label: trans('eligibility.title') },
            m('div', null,
                help(trans('eligibility.help')),

                m('div', { className: 'Form-group' },
                    m('label', trans('eligibility.groups_label')),
                    help(trans('eligibility.groups_help')),
                    groups.length
                        ? m('div', { className: 'ReferralAdmin-groups' },
                            groups.map(function (g) {
                                return m(Switch, {
                                    key: g.id(),
                                    state: selectedGroups.indexOf(g.id()) !== -1,
                                    onchange: function () { toggleGroup(g.id()); },
                                }, g.namePlural());
                            })
                        )
                        : m(LoadingIndicator, { display: 'inline', size: 'small' })
                ),

                m('div', { className: 'Form-group' },
                    m('label', trans('eligibility.min_posts_label')),
                    numberInput('eligibility_min_posts')
                ),

                m('div', { className: 'Form-group' },
                    m('label', trans('eligibility.min_age_label')),
                    numberInput('eligibility_min_age_days')
                ),

                m('div', { className: 'Form-group' },
                    m('label', trans('eligibility.whitelist_label')),
                    help(trans('eligibility.whitelist_help')),
                    m('textarea', {
                        className: 'FormControl',
                        rows: 3,
                        value: setting('eligibility_whitelist') || '',
                        onchange: function (e) { saveSetting('eligibility_whitelist', e.target.value); },
                    })
                )
            )
        );

        // ===== Campaign codes =====
        var codesBody;
        if (self._refCodesLoading) {
            codesBody = m(LoadingIndicator, { display: 'block', size: 'small' });
        } else if (!self._refCodes || !self._refCodes.length) {
            codesBody = m('p', { className: 'ReferralAdmin-empty' }, trans('campaign.none'));
        } else {
            codesBody = m('table', { className: 'ReferralAdmin-table' },
                m('thead', m('tr',
                    m('th', trans('campaign.col_code')),
                    m('th', trans('campaign.col_label')),
                    m('th', trans('campaign.col_uses')),
                    m('th', trans('campaign.col_expiry')),
                    m('th', '')
                )),
                m('tbody', self._refCodes.map(function (c) {
                    return m('tr', { key: c.id },
                        m('td', m('span', { className: 'ReferralAdmin-codeChip' }, c.code)),
                        m('td', c.label || '—'),
                        m('td', String(c.uses)),
                        m('td', c.expiresAt
                            ? m('span', { className: c.expired ? 'ReferralAdmin-expired' : '' },
                                new Date(c.expiresAt).toLocaleDateString()
                                + (c.expired ? ' (' + trans('campaign.expired') + ')' : ''))
                            : trans('campaign.no_expiry')),
                        m('td', m(Button, {
                            className: 'Button Button--icon Button--danger',
                            icon: 'fas fa-trash',
                            loading: self._refDeleting === c.id,
                            title: trans('campaign.delete'),
                            onclick: function () { deleteCode(c.id); },
                        }))
                    );
                }))
            );
        }

        var campaignSection = m(FieldSet, { label: trans('campaign.title') },
            m('div', null,
                help(trans('campaign.help')),
                m('div', { className: 'ReferralAdmin-create' },
                    m('div', { className: 'Form-group ReferralAdmin-create-label' },
                        m('label', trans('campaign.label_label')),
                        m('input', {
                            className: 'FormControl',
                            type: 'text',
                            placeholder: trans('campaign.label_placeholder'),
                            value: self._refNewLabel || '',
                            oninput: function (e) { self._refNewLabel = e.target.value; },
                        })
                    ),
                    m('div', { className: 'Form-group' },
                        m('label', trans('campaign.expiry_label')),
                        m('input', {
                            className: 'FormControl',
                            type: 'date',
                            value: self._refNewExpiry || '',
                            onchange: function (e) { self._refNewExpiry = e.target.value; },
                        })
                    ),
                    m(Button, {
                        className: 'Button Button--primary',
                        icon: 'fas fa-plus',
                        loading: self._refCreating,
                        onclick: createCode,
                    }, trans('campaign.create'))
                ),
                codesBody
            )
        );

        return m('div', { className: 'ExtensionPage-settings' },
            m('div', { className: 'container ReferralAdmin' },
                generalSection,
                eligibilitySection,
                campaignSection
            )
        );
        }
    }

    app.registry.for('linkrobins-referral').registerPage(ReferralSettingsPage);
});
