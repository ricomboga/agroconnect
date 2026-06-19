import { RESPONSES } from '../src/menus/responses';
import { routeUSSD } from '../src/router/menuRouter';

const MAX_USSD_LENGTH = 182;

describe('USSD 182-character hard limit — static response strings', () => {
  const entries = Object.entries(RESPONSES) as Array<[string, string]>;

  it('response table is non-empty', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  entries.forEach(([key, text]) => {
    it(`RESPONSES.${key} (${text.length} chars) must be ≤ ${MAX_USSD_LENGTH}`, () => {
      if (text.length > MAX_USSD_LENGTH) {
        throw new Error(
          `RESPONSES.${key} is ${text.length} characters — ` +
            `exceeds the Africa's Talking limit of ${MAX_USSD_LENGTH}.\n` +
            `Full text:\n"${text}"`,
        );
      }
      expect(text.length).toBeLessThanOrEqual(MAX_USSD_LENGTH);
    });
  });
});

describe('USSD 182-character hard limit — router output for every reachable path', () => {
  const paths: Array<[string, string]> = [
    // Initial / main menu
    ['(empty text)', ''],
    // Farm Records
    ['Farm Records menu', '1'],
    ['Log Activity prompt', '1*1'],
    ['Log Activity saved', '1*1*Planted maize today on Plot A'],
    ['Log Harvest prompt', '1*2'],
    ['Log Harvest saved', '1*2*50kg maize'],
    ['View Summary', '1*3'],
    ['Farm Records back to main', '1*0'],
    // Diagnose
    ['Diagnose prompt', '2'],
    ['Diagnose submitted', '2*Leaves turning yellow and wilting'],
    // Market Prices
    ['Market Prices menu', '3'],
    ['Maize price', '3*1'],
    ['Beans price', '3*2'],
    ['Tomatoes price', '3*3'],
    ['Potatoes price', '3*4'],
    ['Market More menu', '3*5'],
    ['Sorghum price', '3*5*1'],
    ['Millet price', '3*5*2'],
    ['Cassava price', '3*5*3'],
    ['Sugarcane price', '3*5*4'],
    ['Onions price', '3*5*5'],
    ['Market More back', '3*5*0'],
    ['Market Prices back to main', '3*0'],
    // Loans
    ['Loans menu', '4'],
    ['Credit score request', '4*1'],
    ['Loan apply prompt', '4*2'],
    ['Loan apply submitted', '4*2*5000'],
    ['Loan status', '4*3'],
    ['Loans back to main', '4*0'],
    // Weather
    ['Weather result', '5'],
    // Back navigation then re-select
    ['Farm Records → back → Market Prices', '1*0*3'],
    // Invalid inputs
    ['Invalid option at main', '9'],
    ['Invalid option at farm records', '1*9'],
    ['Invalid option at market prices', '3*9'],
    ['Invalid option at market more', '3*5*9'],
    ['Invalid option at loans', '4*9'],
  ];

  paths.forEach(([label, text]) => {
    it(`"${label}" (text="${text}") response must be ≤ ${MAX_USSD_LENGTH} chars`, () => {
      const { response } = routeUSSD(text);
      if (response.length > MAX_USSD_LENGTH) {
        throw new Error(
          `Path "${label}" (text="${text}") produced a response of ` +
            `${response.length} characters — exceeds limit of ${MAX_USSD_LENGTH}.\n` +
            `Full response:\n"${response}"`,
        );
      }
      expect(response.length).toBeLessThanOrEqual(MAX_USSD_LENGTH);
    });
  });
});

describe('USSD router — correctness', () => {
  it('empty text returns main menu (CON prefix)', () => {
    const { response, isEnd } = routeUSSD('');
    expect(response).toMatch(/^CON /);
    expect(isEnd).toBe(false);
  });

  it('weather returns END (session closes)', () => {
    const { response, isEnd } = routeUSSD('5');
    expect(response).toMatch(/^END /);
    expect(isEnd).toBe(true);
  });

  it('diagnose submission returns END', () => {
    const { response, isEnd } = routeUSSD('2*Leaves wilting after irrigation');
    expect(response).toMatch(/^END /);
    expect(isEnd).toBe(true);
  });

  it('back navigation: 1*0 returns main menu', () => {
    const { response } = routeUSSD('1*0');
    expect(response).toBe(RESPONSES.MAIN_MENU);
  });

  it('back then forward: 1*0*3 returns market prices menu', () => {
    const { response } = routeUSSD('1*0*3');
    expect(response).toBe(RESPONSES.MARKET_PRICES_MENU);
  });

  it('market more back: 3*5*0 returns market prices menu', () => {
    const { response } = routeUSSD('3*5*0');
    expect(response).toBe(RESPONSES.MARKET_PRICES_MENU);
  });

  it('invalid option returns CON with retry prompt', () => {
    const { response } = routeUSSD('9');
    expect(response).toBe(RESPONSES.INVALID_OPTION);
    expect(response).toMatch(/^CON /);
  });

  it('loan apply with amount returns END', () => {
    const { response, isEnd } = routeUSSD('4*2*10000');
    expect(response).toBe(RESPONSES.LOAN_APPLY_SENT);
    expect(isEnd).toBe(true);
  });

  it('activity log with text returns END', () => {
    const { response, isEnd } = routeUSSD('1*1*Sprayed pesticide on Plot B');
    expect(response).toBe(RESPONSES.LOG_ACTIVITY_SAVED);
    expect(isEnd).toBe(true);
  });

  it('harvest log with text returns END', () => {
    const { response, isEnd } = routeUSSD('1*2*80kg beans');
    expect(response).toBe(RESPONSES.LOG_HARVEST_SAVED);
    expect(isEnd).toBe(true);
  });
});
