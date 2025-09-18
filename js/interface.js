Fliplet().then(function() {
  var data = Fliplet.Widget.getData() || {};
  var appId = Fliplet.Env.get('appId');
  var page = Fliplet.Widget.getPage();
  var omitPages = page ? [page.id] : [];

  data.passportType = 'saml2';

  if (data.basicAuth === true) {
    $('input[name="basicAuth"]').prop('checked', true);
  }

  $(window).on('resize', Fliplet.Widget.autosize);

  checkSecurityRules();

  var linkProvider = Fliplet.Widget.open('com.fliplet.link', {
    selector: '#redirectAction',
    data: $.extend(true, {
      action: 'screen',
      page: '',
      omitPages: omitPages,
      transition: 'slide.left',
      options: {
        hideAction: true
      }
    }, data.redirectAction)
  });

  var ssoProvider = Fliplet.Widget.open('com.fliplet.sso.' + data.passportType, {
    selector: '#ssoProvider',
    instance: true
  });

  linkProvider.then(function(res) {
    data.buttonLabel = $('[name="buttonLabel"]').val();
    data.basicAuth = !!$('input[name="basicAuth"]:checked').length;
    data.redirectAction = res.data;

    Fliplet.Widget.save(data).then(function() {
      Fliplet.Widget.complete();
    });
  });

  ssoProvider.then(function() {
    linkProvider.forwardSaveRequest();
  });

  $('form').submit(function(event) {
    event.preventDefault();
    ssoProvider.forwardSaveRequest();
  });

  // Fired from Fliplet Studio when the external save button is clicked
  Fliplet.Widget.onSaveRequest(function() {
    $('form').submit();
  });

  // Shows warning if security setting are not configured correctly
  function checkSecurityRules() {
    Fliplet.API.request('v1/apps/' + appId).then(function(result) {
      if (!result || !result.app) {
        return;
      }

      var hooks = FlipletLoginSAMLUtils.get(result.app, 'hooks', []);
      var isSecurityConfigured = FlipletLoginSAMLUtils.some(hooks, function(hook) {
        return hook.script.indexOf(page.id) !== -1;
      });

      if (!hooks.length) {
        $('#security-alert span').text('app has no security rules configured to prevent unauthorized access.');
      }

      $('#security-alert').toggleClass('hidden', isSecurityConfigured);
    });
  }

  // Open security overlay
  $('#security-alert u').on('click', function() {
    Fliplet.Studio.emit('overlay', {
      name: 'app-settings',
      options: {
        title: 'App Settings',
        size: 'large',
        section: 'appSecurity',
        appId: appId
      }
    });
  });
});
