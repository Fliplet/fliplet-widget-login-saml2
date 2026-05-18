Fliplet().then(function() {
  var data = Fliplet.Widget.getData() || {};
  var appId = Fliplet.Env.get('appId');
  var page = Fliplet.Widget.getPage();
  var omitPages = page ? [page.id] : [];

  data.passportType = 'saml2';

  $(window).on('resize', Fliplet.Widget.autosize);

  checkSecurityRules();

  // Defaults to unchecked — only enable when explicitly saved as true
  $('[name="basicAuth"]').prop('checked', data.basicAuth === true);

  if (data.basicAuth === true) {
    $('#basicAuthPanel').addClass('in').attr('aria-expanded', 'true');
    $('[href="#basicAuthPanel"]')
      .addClass('expanded')
      .attr('aria-expanded', 'true')
      .find('.toggle-label').text('Hide Basic Authentication Option');
  }

  $('#basicAuthPanel').on('shown.bs.collapse hidden.bs.collapse', function() {
    Fliplet.Widget.autosize();
  });

  $('#basicAuthPanel').on('show.bs.collapse', function() {
    $('[href="#basicAuthPanel"]')
      .addClass('expanded')
      .attr('aria-expanded', 'true')
      .find('.toggle-label').text('Hide Basic Authentication Option');
  });

  $('#basicAuthPanel').on('hide.bs.collapse', function() {
    $('[href="#basicAuthPanel"]')
      .removeClass('expanded')
      .attr('aria-expanded', 'false')
      .find('.toggle-label').text('Show Basic Authentication Option');
  });

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
    data.redirectAction = res.data;
    data.basicAuth = !!$('[name="basicAuth"]').prop('checked');

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
