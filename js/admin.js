'use strict';

app.initializers.add('linkrobins/referral-admin', function () {
    var override      = flarum.reg.get('core', 'common/extend').override;
    var ExtensionPage = flarum.reg.get('core', 'admin/components/ExtensionPage');
    var saveSettings  = flarum.reg.get('core', 'admin/utils/saveSettings');

    override(ExtensionPage.prototype, 'content', function (original) {
        if (!this.extension || this.extension.id !== 'linkrobins-referral') {
            return original();
        }

        var setting = 'linkrobins-referral.require_referral';
        var current = app.data.settings[setting] === '1';

        var toggle = function () {
            var newVal = !current;
            var body = {};
            body[setting] = newVal ? '1' : '0';
            saveSettings(body).then(function () {
                current = newVal;
                m.redraw();
            });
        };

        return m('div', { className: 'ExtensionPage-settings' },
            m('div', { className: 'container' },
                m('div', { className: 'Form-group' },
                    m('label', 'Require invite code to register'),
                    m('p', { className: 'helpText' },
                        'When enabled, users must enter a valid invite code to complete registration.'
                    ),
                    m('div', { style: 'margin-top:.5rem;' },
                        m('label', { style: 'display:flex;align-items:center;gap:10px;cursor:pointer;' },
                            m('input', {
                                type: 'checkbox',
                                checked: current,
                                onchange: toggle,
                            }),
                            m('span', current ? 'Enabled' : 'Disabled')
                        )
                    )
                )
            )
        );
    });
});

module.exports = {};
