Fliplet.Widget.instance('sso-saml', function(data) {
  // Load session and prepare cookie
  Fliplet.Session.get();
  var $el = $(this);
  var $form = $el.find('form');

  $el.fadeIn(250);

  $form.submit(function(event) {
    event.preventDefault();

    if (!data.passportType || !data.redirectAction) {
      console.warn('Incomplete component configuration');
      return;
    }

    $el.find('.sso-error-holder').addClass('hidden');

    var ssoProviderPackageName = 'com.fliplet.sso.' + data.passportType;
    var ssoProvider = Fliplet.Widget.get(ssoProviderPackageName);

    if (!ssoProvider || typeof ssoProvider.authorize !== 'function') {
      throw new Error('Provider ' + ssoProviderPackageName + ' has not registered on Fliplet.Widget.register with an "authorize()" function.');
    }

    ssoProvider
      .authorize({
        username: $form.find('input[name="username"]').val(),
        password: $form.find('input[name="password"]').val()
      })
      .then(function onAuthorized() {
        $form.hide();
        $el.find('.sso-confirmation').fadeIn(250, function() {
          setTimeout(function() {
            Fliplet.Navigate.to(data.redirectAction);
          }, 100);
        });
      })
      .catch(function onError(err) {
        // woop woop
        console.error(err);
        $el.find('.sso-error-holder').html(err);
        $el.find('.sso-error-holder').removeClass('hidden');
      });
  });
});
