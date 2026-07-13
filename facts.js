// ── DDC knowledge base: the single source of truth for company facts ──
// Every page, the chatbot, the site tour and the portal quiz read these values,
// so a fact (e.g. the founding year) can never diverge between surfaces again.
// Edit HERE, not in the pages.
window.DDC_FACTS = {
  founded: 1996,                                  // как «Банковское сервисное бюро НБ РК»
  foundedAs: {
    ru: 'Банковское сервисное бюро НБ РК',
    en: 'Bank Service Bureau of the NBK',
    kz: 'ҚҰБ Банктік сервистік бюросы'
  },
  reorgDate: '18.07.2025',
  reorgYear: 2025,
  name: {
    ru: 'АО «Центр цифрового развития Национального Банка Казахстана»',
    en: 'Digital Development Center of the National Bank of Kazakhstan JSC',
    kz: '«Қазақстан Ұлттық Банкінің Цифрлық даму орталығы» АҚ'
  },
  shareholder: {
    ru: 'Национальный Банк РК',
    en: 'the National Bank of Kazakhstan',
    kz: 'ҚР Ұлттық Банкі'
  },
  systemsBuilt: 50,
  systemsLive: 24,
  experienceYears: 30,
  contactCenter: '1477',
  // Canonical trilingual history sentence, assembled from the values above.
  history: null // filled below
};
(function(F){
  F.history = {
    ru: 'Компания основана в ' + F.founded + ' году как «' + F.foundedAs.ru + '». ' +
        F.reorgDate + ' реорганизована в ' + F.name.ru + '. Единственный акционер — ' + F.shareholder.ru + '.',
    en: 'The company was founded in ' + F.founded + ' as the ' + F.foundedAs.en + '. On 18 July ' + F.reorgYear +
        ' it was reorganized into ' + F.name.en + '. The sole shareholder is ' + F.shareholder.en + '.',
    kz: 'Компания ' + F.founded + ' жылы «' + F.foundedAs.kz + '» ретінде құрылды. ' + F.reorgYear +
        ' жылдың 18 шілдесінде ' + F.name.kz + ' болып қайта құрылды. Жалғыз акционер — ' + F.shareholder.kz + '.'
  };
})(window.DDC_FACTS);
// Elements marked <span data-fact="founded"> render the canonical value from this file.
document.addEventListener('DOMContentLoaded', function(){
  var els = document.querySelectorAll('[data-fact]');
  for (var i = 0; i < els.length; i++) {
    var v = window.DDC_FACTS[els[i].getAttribute('data-fact')];
    if (v != null && typeof v !== 'object') els[i].textContent = v;
  }
});
