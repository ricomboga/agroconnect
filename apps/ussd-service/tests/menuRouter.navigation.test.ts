import { routeUSSD } from '../src/router/menuRouter';
import { RESPONSES } from '../src/menus/responses';

describe('USSD router — back navigation from sub-menus', () => {
  it('1*1*0 — back from farm_log_activity returns farm_records menu', () => {
    const { response, menuState } = routeUSSD('1*1*0');
    expect(response).toBe(RESPONSES.FARM_RECORDS_MENU);
    expect(menuState).toBe('farm_records');
  });

  it('1*1*0*2 — back from farm_log_activity then select harvest prompt', () => {
    const { response, menuState } = routeUSSD('1*1*0*2');
    expect(response).toBe(RESPONSES.LOG_HARVEST_PROMPT);
    expect(menuState).toBe('farm_log_harvest');
  });

  it('1*2*0 — back from farm_log_harvest returns farm_records menu', () => {
    const { response, menuState } = routeUSSD('1*2*0');
    expect(response).toBe(RESPONSES.FARM_RECORDS_MENU);
    expect(menuState).toBe('farm_records');
  });

  it('1*2*0*1 — back from farm_log_harvest then select activity prompt', () => {
    const { response, menuState } = routeUSSD('1*2*0*1');
    expect(response).toBe(RESPONSES.LOG_ACTIVITY_PROMPT);
    expect(menuState).toBe('farm_log_activity');
  });

  it('2*0 — back from diagnose returns main menu', () => {
    const { response, menuState } = routeUSSD('2*0');
    expect(response).toBe(RESPONSES.MAIN_MENU);
    expect(menuState).toBe('main');
  });

  it('2*0*1 — back from diagnose then select farm records', () => {
    const { response, menuState } = routeUSSD('2*0*1');
    expect(response).toBe(RESPONSES.FARM_RECORDS_MENU);
    expect(menuState).toBe('farm_records');
  });

  it('3*0 — back from market_prices returns main menu', () => {
    const { response, menuState } = routeUSSD('3*0');
    expect(response).toBe(RESPONSES.MAIN_MENU);
    expect(menuState).toBe('main');
  });

  it('3*0*4 — back from market_prices then select loans', () => {
    const { response, menuState } = routeUSSD('3*0*4');
    expect(response).toBe(RESPONSES.LOANS_MENU);
    expect(menuState).toBe('loans');
  });

  it('3*5*0*1 — back from market_more then select maize price', () => {
    const { response, menuState } = routeUSSD('3*5*0*1');
    expect(response).toBe(RESPONSES.MAIZE_PRICE);
    expect(menuState).toBe('market_prices');
  });

  it('3*5*0*5 — back from market_more then go to market_more again', () => {
    const { response, menuState } = routeUSSD('3*5*0*5');
    expect(response).toBe(RESPONSES.MARKET_MORE_MENU);
    expect(menuState).toBe('market_more');
  });

  it('4*0 — back from loans returns main menu', () => {
    const { response, menuState } = routeUSSD('4*0');
    expect(response).toBe(RESPONSES.MAIN_MENU);
    expect(menuState).toBe('main');
  });

  it('4*0*3 — back from loans then select market prices', () => {
    const { response, menuState } = routeUSSD('4*0*3');
    expect(response).toBe(RESPONSES.MARKET_PRICES_MENU);
    expect(menuState).toBe('market_prices');
  });

  it('4*2*0 — back from loan_apply returns loans menu', () => {
    const { response, menuState } = routeUSSD('4*2*0');
    expect(response).toBe(RESPONSES.LOANS_MENU);
    expect(menuState).toBe('loans');
  });

  it('4*2*0*1 — back from loan_apply then select credit score', () => {
    const { response, menuState } = routeUSSD('4*2*0*1');
    expect(response).toBe(RESPONSES.CREDIT_SCORE_REQUEST);
    expect(menuState).toBe('loans');
  });
});

describe('USSD router — empty input in prompting states', () => {
  it('1*1* — empty activity text shows LOG_ACTIVITY_PROMPT again', () => {
    const { response, menuState } = routeUSSD('1*1*');
    expect(response).toBe(RESPONSES.LOG_ACTIVITY_PROMPT);
    expect(menuState).toBe('farm_log_activity');
  });

  it('1*2* — empty harvest text shows LOG_HARVEST_PROMPT again', () => {
    const { response, menuState } = routeUSSD('1*2*');
    expect(response).toBe(RESPONSES.LOG_HARVEST_PROMPT);
    expect(menuState).toBe('farm_log_harvest');
  });

  it('2* — empty diagnosis text shows DIAGNOSE_PROMPT again', () => {
    const { response, menuState } = routeUSSD('2*');
    expect(response).toBe(RESPONSES.DIAGNOSE_PROMPT);
    expect(menuState).toBe('diagnose');
  });

  it('4*2* — empty loan amount shows LOAN_APPLY_PROMPT again', () => {
    const { response, menuState } = routeUSSD('4*2*');
    expect(response).toBe(RESPONSES.LOAN_APPLY_PROMPT);
    expect(menuState).toBe('loan_apply');
  });
});

describe('USSD router — diagnose back then navigate', () => {
  it('2*0*2 — back from diagnose then go to diagnose again', () => {
    const { response, menuState } = routeUSSD('2*0*2');
    expect(response).toBe(RESPONSES.DIAGNOSE_PROMPT);
    expect(menuState).toBe('diagnose');
  });
});
