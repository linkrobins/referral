'use strict';

var qrModal = require('./qrModal');

app.initializers.add('linkrobins/referral-admin', function () {
  var ExtensionPage = flarum.reg.get('core', 'admin/components/ExtensionPage');
  var saveSettings = flarum.reg.get('core', 'admin/utils/saveSettings');
  var FieldSet = flarum.reg.get('core', 'common/components/FieldSet');
  var Switch = flarum.reg.get('core', 'common/components/Switch');
  var Button = flarum.reg.get('core', 'common/components/Button');
  var LoadingIndicator = flarum.reg.get('core', 'common/components/LoadingIndicator');

  function apiBase() {
    return (app.forum && app.forum.attribute('apiUrl')) || '/api';
  }

  // Campaign invite link. The admin app can't resolve forum routes (e.g. a
  // private-facade sign-up page), so this targets the forum root: the forum
  // frontend captures ?ref= from any page it boots on.
  function inviteUrl(code) {
    var base = (app.forum && app.forum.attribute('baseUrl')) || window.location.origin;
    return base.replace(/\/$/, '') + '/?ref=' + encodeURIComponent(code);
  }

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

  // Groups offered by the eligibility picker — everything except the virtual
  // Guest (2) and Member (3) groups.
  function pickableGroups() {
    return app.store.all('groups').filter(function (g) {
      return g.id() !== '2' && g.id() !== '3';
    });
  }

  // A dedicated settings page registered for this extension only, instead of
  // overriding the shared ExtensionPage.prototype.content (which ran for every
  // extension's admin page and early-returned). The admin route resolver swaps
  // this in when /extension/linkrobins-referral is opened.
  class ReferralSettingsPage extends ExtensionPage {
    oninit(vnode) {
      super.oninit(vnode);

      this.codes = null;
      this.codesLoading = false;
      this.creating = false;
      this.deletingId = null;
      this.newLabel = '';
      this.newExpiry = '';
      this.loadCodes();

      // The store only has groups if another admin page already loaded them.
      if (!pickableGroups().length) {
        app.store.find('groups').then(m.redraw);
      }
    }

    content() {
      return m(
        'div',
        { className: 'ExtensionPage-settings' },
        m('div', { className: 'container ReferralAdmin' }, this.renderGeneralSection(), this.renderEligibilitySection(), this.renderCampaignSection())
      );
    }

    // ===== General =====
    renderGeneralSection() {
      return m(
        FieldSet,
        { label: trans('settings.title') },
        m(
          'div',
          null,
          m(
            Switch,
            {
              state: setting('require_referral') === '1',
              onchange: function (val) {
                saveSetting('require_referral', val ? '1' : '0').then(m.redraw);
              },
            },
            trans('settings.require_label')
          ),
          help(trans('settings.require_help'))
        )
      );
    }

    // ===== Eligibility =====
    renderEligibilitySection() {
      var self = this;
      var groups = pickableGroups();
      var selected = this.selectedGroupIds();

      return m(
        FieldSet,
        { label: trans('eligibility.title') },
        m(
          'div',
          null,
          help(trans('eligibility.help')),

          m(
            'div',
            { className: 'Form-group' },
            m('label', trans('eligibility.groups_label')),
            help(trans('eligibility.groups_help')),
            groups.length
              ? m(
                  'div',
                  { className: 'ReferralAdmin-groups' },
                  groups.map(function (g) {
                    return m(
                      Switch,
                      {
                        key: g.id(),
                        state: selected.indexOf(g.id()) !== -1,
                        onchange: function () {
                          self.toggleGroup(g.id());
                        },
                      },
                      g.namePlural()
                    );
                  })
                )
              : m(LoadingIndicator, { display: 'inline', size: 'small' })
          ),

          m('div', { className: 'Form-group' }, m('label', trans('eligibility.min_posts_label')), this.numberInput('eligibility_min_posts')),

          m('div', { className: 'Form-group' }, m('label', trans('eligibility.min_age_label')), this.numberInput('eligibility_min_age_days')),

          m(
            'div',
            { className: 'Form-group' },
            m('label', trans('eligibility.whitelist_label')),
            help(trans('eligibility.whitelist_help')),
            m('textarea', {
              className: 'FormControl',
              rows: 3,
              value: setting('eligibility_whitelist') || '',
              onchange: function (e) {
                saveSetting('eligibility_whitelist', e.target.value);
              },
            })
          )
        )
      );
    }

    // ===== Campaign codes =====
    renderCampaignSection() {
      var self = this;

      return m(
        FieldSet,
        { label: trans('campaign.title') },
        m(
          'div',
          null,
          help(trans('campaign.help')),
          m(
            'div',
            { className: 'ReferralAdmin-create' },
            m(
              'div',
              { className: 'Form-group ReferralAdmin-create-label' },
              m('label', trans('campaign.label_label')),
              m('input', {
                className: 'FormControl',
                type: 'text',
                placeholder: trans('campaign.label_placeholder'),
                value: this.newLabel || '',
                oninput: function (e) {
                  self.newLabel = e.target.value;
                },
              })
            ),
            m(
              'div',
              { className: 'Form-group' },
              m('label', trans('campaign.expiry_label')),
              m('input', {
                className: 'FormControl',
                type: 'date',
                value: this.newExpiry || '',
                onchange: function (e) {
                  self.newExpiry = e.target.value;
                },
              })
            ),
            m(
              Button,
              {
                className: 'Button Button--primary',
                icon: 'fas fa-plus',
                loading: this.creating,
                onclick: function () {
                  self.createCode();
                },
              },
              trans('campaign.create')
            )
          ),
          this.renderCodesTable()
        )
      );
    }

    renderCodesTable() {
      var self = this;

      if (this.codesLoading) {
        return m(LoadingIndicator, { display: 'block', size: 'small' });
      }

      if (!this.codes || !this.codes.length) {
        return m('p', { className: 'ReferralAdmin-empty' }, trans('campaign.none'));
      }

      return m(
        'table',
        { className: 'ReferralAdmin-table' },
        m(
          'thead',
          m(
            'tr',
            m('th', trans('campaign.col_code')),
            m('th', trans('campaign.col_label')),
            m('th', trans('campaign.col_uses')),
            m('th', trans('campaign.col_expiry')),
            m('th', '')
          )
        ),
        m(
          'tbody',
          this.codes.map(function (c) {
            return self.renderCodeRow(c);
          })
        )
      );
    }

    renderCodeRow(c) {
      var self = this;

      return m(
        'tr',
        { key: c.id },
        m('td', m('span', { className: 'ReferralAdmin-codeChip' }, c.code)),
        m('td', c.label || '—'),
        m('td', String(c.uses)),
        m(
          'td',
          c.expiresAt
            ? m(
                'span',
                { className: c.expired ? 'ReferralAdmin-expired' : '' },
                new Date(c.expiresAt).toLocaleDateString() + (c.expired ? ' (' + trans('campaign.expired') + ')' : '')
              )
            : trans('campaign.no_expiry')
        ),
        m(
          'td',
          { className: 'ReferralAdmin-actions' },
          m(Button, {
            className: 'Button Button--icon',
            icon: 'fas fa-qrcode',
            title: trans('campaign.qr'),
            onclick: function () {
              qrModal.show(inviteUrl(c.code), c.code);
            },
          }),
          m(Button, {
            className: 'Button Button--icon Button--danger',
            icon: 'fas fa-trash',
            loading: self.deletingId === c.id,
            title: trans('campaign.delete'),
            onclick: function () {
              self.deleteCode(c.id);
            },
          })
        )
      );
    }

    // ===== State + actions =====
    loadCodes() {
      var self = this;

      this.codesLoading = true;
      app
        .request({ method: 'GET', url: apiBase() + '/referral/campaign-codes' })
        .then(function (res) {
          self.codes = (res && res.data) || [];
          self.codesLoading = false;
          m.redraw();
        })
        .catch(function () {
          self.codes = [];
          self.codesLoading = false;
          m.redraw();
        });
    }

    selectedGroupIds() {
      var ids;
      try {
        ids = JSON.parse(setting('eligibility_groups') || '[]');
      } catch (e) {
        ids = [];
      }
      return (ids || []).map(String);
    }

    toggleGroup(id) {
      id = String(id);
      var ids = this.selectedGroupIds();
      var idx = ids.indexOf(id);
      if (idx === -1) ids.push(id);
      else ids.splice(idx, 1);
      saveSetting('eligibility_groups', JSON.stringify(ids.map(Number))).then(m.redraw);
    }

    createCode() {
      var self = this;
      var label = (this.newLabel || '').trim();
      var expiry = this.newExpiry || '';
      var attrs = {};
      if (label) attrs.label = label;
      if (expiry) attrs.expiresAt = new Date(expiry + 'T23:59:59').toISOString();

      this.creating = true;
      m.redraw();
      app
        .request({ method: 'POST', url: apiBase() + '/referral/campaign-codes', body: { data: { attributes: attrs } } })
        .then(function (res) {
          self.codes = [res.data].concat(self.codes || []);
          self.newLabel = '';
          self.newExpiry = '';
          self.creating = false;
          m.redraw();
        })
        .catch(function () {
          self.creating = false;
          m.redraw();
        });
    }

    deleteCode(id) {
      var self = this;

      if (!confirm(trans('campaign.confirm_delete'))) return;
      this.deletingId = id;
      m.redraw();
      app
        .request({ method: 'DELETE', url: apiBase() + '/referral/campaign-codes/' + id })
        .then(function () {
          self.codes = (self.codes || []).filter(function (c) {
            return c.id !== id;
          });
          self.deletingId = null;
          m.redraw();
        })
        .catch(function () {
          self.deletingId = null;
          m.redraw();
        });
    }

    numberInput(key) {
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
  }

  app.registry.for('linkrobins-referral').registerPage(ReferralSettingsPage);
});
