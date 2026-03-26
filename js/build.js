Fliplet.Widget.instance('sso-saml', function(data) {
  var $btn = $(this);
  var $confirmation = $('.sso-confirmation');
  var $error = $('.sso-error-holder');

  var buttonLabel = $btn.text();
  var appId = Fliplet.Env.get('masterAppId');
  var logPrefix = '[DEBUG] [SAML2 LOGIN] appId: ' + appId;

  function init() {
    $confirmation.translate();
    $btn.text(T('widgets.login.saml2.wait')).addClass('disabled');

    console.log(logPrefix, 'init() — checking existing session');

    // Load session and prepare cookie
    Fliplet.Session.get().then(function(session) {
      $btn.text(buttonLabel).removeClass('disabled');

      // User not logged in
      if (!session || !session.accounts) {
        console.log(logPrefix, 'init() — no session or accounts, showing login button');

        return Promise.reject();
      }

      var saml2Accounts = session.accounts.saml2 || [];

      // No SAML2 account found
      if (!saml2Accounts.length) {
        console.log(logPrefix, 'init() — no saml2 accounts in session, showing login button');

        return Promise.reject();
      }

      var entry = saml2Accounts[0];

      console.log(logPrefix, 'init() — existing saml2 session found, user:', FlipletLoginSAMLUtils.get(entry, 'user.email'), '— auto-redirecting');

      // Update stored user data on retrieved session
      var user = {
        type: 'saml2',
        organizationId: Fliplet.Env.get('organizationId'),
        region: Fliplet.User.getAuthToken().substr(0, 2)
      };

      assignIn(user, FlipletLoginSAMLUtils.pick(entry.user, ['id', 'email', 'firstName', 'lastName']));

      return Fliplet.Profile.set({
        user: user,
        email: FlipletLoginSAMLUtils.get(entry, 'user.email'),
        firstName: FlipletLoginSAMLUtils.get(entry, 'user.firstName'),
        lastName: FlipletLoginSAMLUtils.get(entry, 'user.lastName')
      }).then(function() {
        console.log(logPrefix, 'init() — profile set, running sessionValidate hook');

        return Fliplet.Hooks.run('sessionValidate', {
          passport: 'saml2',
          userProfile: entry.user
        });
      });
    }).then(function() {
      if (typeof data.redirectAction === 'undefined') {
        console.warn(logPrefix, 'init() — no redirectAction configured');

        return;
      }

      console.log(logPrefix, 'init() — sessionValidate passed, navigating to secured page');

      return Fliplet.Navigate.to(data.redirectAction);
    }).catch(function(err) {
      $btn.text(buttonLabel).removeClass('disabled');
      console.error(logPrefix, 'init() — session check failed or no saml2 account:', err);

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

      console.log(logPrefix, 'button clicked — starting authorize()');
      $btn.text(T('widgets.login.saml2.wait')).addClass('disabled');

      ssoProvider.authorize(data).then(function onAuthorized() {
        console.log(logPrefix, 'authorize() resolved — showing verifying toast');

        return Fliplet.UI.Toast({
          position: 'bottom',
          backdrop: true,
          tapToDismiss: false,
          duration: false,
          message: T('widgets.login.saml2.verifying')
        }).then(function(toast) {
          console.log(logPrefix, 'fetching saml2 passport data');

          return Fliplet.Session.passport('saml2').data().then(function(response) {
            console.log(logPrefix, 'passport data received, user:', response.user && response.user.email);

            var user = {
              type: 'saml2',
              organizationId: Fliplet.Env.get('organizationId'),
              region: Fliplet.User.getAuthToken().substr(0, 2)
            };

            assignIn(user, FlipletLoginSAMLUtils.pick(response.user, ['id', 'email', 'firstName', 'lastName']));

            return Fliplet.Profile.set({
              user: user,
              email: response.user.email,
              firstName: response.user.firstName,
              lastName: response.user.lastName
            }).then(function() {
              console.log(logPrefix, 'profile set, running login hook');

              return Fliplet.Hooks.run('login', {
                passport: 'saml2',
                userProfile: response.user
              });
            }).then(function() {
              console.log(logPrefix, 'login hook passed, navigating to secured page');
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
        console.error(logPrefix, 'authorize or post-auth flow FAILED:', err);
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
