Fliplet.Widget.instance('sso-saml', function(data) {
  var $btn = $(this);
  var $confirmation = $('.sso-confirmation');
  var $error = $('.sso-error-holder');

  var buttonLabel = $btn.text();

  function init() {
    $confirmation.translate();
    $btn.text(T('widgets.login.saml2.wait')).addClass('disabled');

    // Load session and prepare cookie
    Fliplet.Session.get().then(function(session) {
      $btn.text(buttonLabel).removeClass('disabled');

      // User not logged in
      if (!session || !session.accounts) {
        return Promise.reject();
      }

      var saml2Accounts = session.accounts.saml2 || [];

      // No SAML2 account found
      if (!saml2Accounts.length) {
        return Promise.reject();
      }

      var entry = saml2Accounts[0];

      // Update stored user data on retrieved session
      var user = {
        type: 'saml2',
        organizationId: Fliplet.Env.get('organizationId'),
        region: Fliplet.User.getAuthToken().substr(0, 2)
      };

      _.assignIn(user, _.pick(entry.user, ['id', 'email', 'firstName', 'lastName']));

      return Fliplet.Profile.set({
        user: user,
        email: _.get(entry, 'user.email'),
        firstName: _.get(entry, 'user.firstName'),
        lastName: _.get(entry, 'user.lastName')
      }).then(function() {
        return Fliplet.Hooks.run('sessionValidate', {
          passport: 'saml2',
          userProfile: entry.user
        });
      });
    }).then(function() {
      if (typeof data.redirectAction === 'undefined') {
        return;
      }

      return Fliplet.Navigate.to(data.redirectAction);
    }).catch(function(err) {
      $btn.text(buttonLabel).removeClass('disabled');
      console.error('Could not load the session', err);

      if (err) {
        $error.html(Fliplet.parseError(err));
        $error.removeClass('hidden');
      }
    });

    $btn.click(function(event) {
      event.preventDefault();

      if (!data.passportType || !data.redirectAction) {
        Fliplet.UI.Toast(T('widgets.login.saml2.errorToast.incompleteConfiguration'));

        return;
      }

      $error.addClass('hidden');

      var ssoProviderPackageName = 'com.fliplet.sso.' + data.passportType;
      var ssoProvider = Fliplet.Widget.get(ssoProviderPackageName);

      if (!ssoProvider || typeof ssoProvider.authorize !== 'function') {
        throw new Error('Provider ' + ssoProviderPackageName + ' has not registered on Fliplet.Widget.register with an "authorize()" function.');
      }

      $btn.text(T('widgets.login.saml2.wait')).addClass('disabled');

      ssoProvider.authorize(data).then(function onAuthorized() {
        return Fliplet.UI.Toast({
          position: 'bottom',
          backdrop: true,
          tapToDismiss: false,
          duration: false,
          message: T('widgets.login.saml2.verifying')
        }).then(function(toast) {
          return Fliplet.Session.passport('saml2').data().then(function(response) {
            var user = {
              type: 'saml2',
              organizationId: Fliplet.Env.get('organizationId'),
              region: Fliplet.User.getAuthToken().substr(0, 2)
            };

            _.assignIn(user, _.pick(response.user, ['id', 'email', 'firstName', 'lastName']));

            return Fliplet.Profile.set({
              user: user,
              email: response.user.email,
              firstName: response.user.firstName,
              lastName: response.user.lastName
            }).then(function() {
              return Fliplet.Hooks.run('login', {
                passport: 'saml2',
                userProfile: response.user
              });
            }).then(function() {
              toast.dismiss();

              $('.sso-confirmation').fadeIn(250, function() {
                setTimeout(function() {
                  // Do not track login related redirects
                  data.redirectAction.track = false;
                  Fliplet.Navigate.to(data.redirectAction);
                }, 100);
              });
            });
          });
        });
      }).catch(function onError(err) {
        console.error(err);
        $error.html(err);
        $error.removeClass('hidden');
        $btn.text(buttonLabel).removeClass('disabled');
      });
    });
  }

  Fliplet().then(function() {
    init();
  });
});
