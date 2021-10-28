Fliplet.Widget.instance('sso-saml', function(data) {
  var $btn = $(this);
  var $error = $('.sso-error-holder');

  var buttonLabel = $btn.text();

  $btn.text('Please wait...').addClass('disabled');

  // Load session and prepare cookie
  Fliplet.Session.get().then(function() {
    $btn.text(buttonLabel).removeClass('disabled');
  }).catch(function(err) {
    $btn.text(buttonLabel).removeClass('disabled');
    console.error('Could not load the session', err);
    $error.html(err.message || err.description || 'Please make sure you\'re connected to the internet before logging in.');
    $error.removeClass('hidden');
  });

  $btn.click(function(event) {
    event.preventDefault();

    if (!data.passportType || !data.redirectAction) {
      Fliplet.UI.Toast('Incomplete component configuration');
      return;
    }

    $error.addClass('hidden');

    var ssoProviderPackageName = 'com.fliplet.sso.' + data.passportType;
    var ssoProvider = Fliplet.Widget.get(ssoProviderPackageName);

    if (!ssoProvider || typeof ssoProvider.authorize !== 'function') {
      throw new Error('Provider ' + ssoProviderPackageName + ' has not registered on Fliplet.Widget.register with an "authorize()" function.');
    }

    $btn.text('Please wait...').addClass('disabled');

    ssoProvider.authorize(data).then(function onAuthorized() {
      return Fliplet.UI.Toast({
        position: 'bottom',
        backdrop: true,
        tapToDismiss: false,
        duration: false,
        message: 'Verifying your login...'
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
          }).then(function () {
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
});
