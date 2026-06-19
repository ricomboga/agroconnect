import { RESPONSES } from '../menus/responses.js';
import type { MenuState } from '../types/index.js';

interface RouteResult {
  response: string;
  menuState: MenuState;
  isEnd: boolean;
}

export function routeUSSD(text: string): RouteResult {
  const trimmed = text.trim();

  if (!trimmed) {
    return { response: RESPONSES.MAIN_MENU, menuState: 'main', isEnd: false };
  }

  const parts = trimmed.split('*');
  const { response, menuState } = navigate(parts);
  return { response, menuState, isEnd: response.startsWith('END') };
}

interface NavResult {
  response: string;
  menuState: MenuState;
}

function navigate(parts: string[]): NavResult {
  let state: MenuState = 'main';
  let i = 0;

  while (i < parts.length) {
    const input = parts[i];
    i++;

    switch (state) {
      case 'main': {
        switch (input) {
          case '1':
            if (i === parts.length) return { response: RESPONSES.FARM_RECORDS_MENU, menuState: 'farm_records' };
            state = 'farm_records';
            break;
          case '2':
            if (i === parts.length) return { response: RESPONSES.DIAGNOSE_PROMPT, menuState: 'diagnose' };
            state = 'diagnose';
            break;
          case '3':
            if (i === parts.length) return { response: RESPONSES.MARKET_PRICES_MENU, menuState: 'market_prices' };
            state = 'market_prices';
            break;
          case '4':
            if (i === parts.length) return { response: RESPONSES.LOANS_MENU, menuState: 'loans' };
            state = 'loans';
            break;
          case '5':
            return { response: RESPONSES.WEATHER_RESULT, menuState: 'main' };
          default:
            return { response: RESPONSES.INVALID_OPTION, menuState: 'main' };
        }
        break;
      }

      case 'farm_records': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.MAIN_MENU, menuState: 'main' };
          state = 'main';
          break;
        }
        switch (input) {
          case '1':
            if (i === parts.length) return { response: RESPONSES.LOG_ACTIVITY_PROMPT, menuState: 'farm_log_activity' };
            state = 'farm_log_activity';
            break;
          case '2':
            if (i === parts.length) return { response: RESPONSES.LOG_HARVEST_PROMPT, menuState: 'farm_log_harvest' };
            state = 'farm_log_harvest';
            break;
          case '3':
            return { response: RESPONSES.VIEW_SUMMARY, menuState: 'farm_records' };
          default:
            return { response: RESPONSES.INVALID_OPTION, menuState: 'farm_records' };
        }
        break;
      }

      case 'farm_log_activity': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.FARM_RECORDS_MENU, menuState: 'farm_records' };
          state = 'farm_records';
          break;
        }
        if (input.trim()) return { response: RESPONSES.LOG_ACTIVITY_SAVED, menuState: 'farm_log_activity' };
        return { response: RESPONSES.LOG_ACTIVITY_PROMPT, menuState: 'farm_log_activity' };
      }

      case 'farm_log_harvest': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.FARM_RECORDS_MENU, menuState: 'farm_records' };
          state = 'farm_records';
          break;
        }
        if (input.trim()) return { response: RESPONSES.LOG_HARVEST_SAVED, menuState: 'farm_log_harvest' };
        return { response: RESPONSES.LOG_HARVEST_PROMPT, menuState: 'farm_log_harvest' };
      }

      case 'diagnose': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.MAIN_MENU, menuState: 'main' };
          state = 'main';
          break;
        }
        if (input.trim()) return { response: RESPONSES.DIAGNOSE_SENT, menuState: 'diagnose' };
        return { response: RESPONSES.DIAGNOSE_PROMPT, menuState: 'diagnose' };
      }

      case 'market_prices': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.MAIN_MENU, menuState: 'main' };
          state = 'main';
          break;
        }
        switch (input) {
          case '1': return { response: RESPONSES.MAIZE_PRICE, menuState: 'market_prices' };
          case '2': return { response: RESPONSES.BEANS_PRICE, menuState: 'market_prices' };
          case '3': return { response: RESPONSES.TOMATOES_PRICE, menuState: 'market_prices' };
          case '4': return { response: RESPONSES.POTATOES_PRICE, menuState: 'market_prices' };
          case '5':
            if (i === parts.length) return { response: RESPONSES.MARKET_MORE_MENU, menuState: 'market_more' };
            state = 'market_more';
            break;
          default:
            return { response: RESPONSES.INVALID_OPTION, menuState: 'market_prices' };
        }
        break;
      }

      case 'market_more': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.MARKET_PRICES_MENU, menuState: 'market_prices' };
          state = 'market_prices';
          break;
        }
        switch (input) {
          case '1': return { response: RESPONSES.SORGHUM_PRICE, menuState: 'market_more' };
          case '2': return { response: RESPONSES.MILLET_PRICE, menuState: 'market_more' };
          case '3': return { response: RESPONSES.CASSAVA_PRICE, menuState: 'market_more' };
          case '4': return { response: RESPONSES.SUGARCANE_PRICE, menuState: 'market_more' };
          case '5': return { response: RESPONSES.ONIONS_PRICE, menuState: 'market_more' };
          default:  return { response: RESPONSES.INVALID_OPTION, menuState: 'market_more' };
        }
      }

      case 'loans': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.MAIN_MENU, menuState: 'main' };
          state = 'main';
          break;
        }
        switch (input) {
          case '1': return { response: RESPONSES.CREDIT_SCORE_REQUEST, menuState: 'loans' };
          case '2':
            if (i === parts.length) return { response: RESPONSES.LOAN_APPLY_PROMPT, menuState: 'loan_apply' };
            state = 'loan_apply';
            break;
          case '3': return { response: RESPONSES.LOAN_STATUS, menuState: 'loans' };
          default:  return { response: RESPONSES.INVALID_OPTION, menuState: 'loans' };
        }
        break;
      }

      case 'loan_apply': {
        if (input === '0') {
          if (i === parts.length) return { response: RESPONSES.LOANS_MENU, menuState: 'loans' };
          state = 'loans';
          break;
        }
        if (input.trim()) return { response: RESPONSES.LOAN_APPLY_SENT, menuState: 'loan_apply' };
        return { response: RESPONSES.LOAN_APPLY_PROMPT, menuState: 'loan_apply' };
      }
    }
  }

  return stateToMenu(state);
}

function stateToMenu(state: MenuState): NavResult {
  switch (state) {
    case 'main':              return { response: RESPONSES.MAIN_MENU, menuState: 'main' };
    case 'farm_records':      return { response: RESPONSES.FARM_RECORDS_MENU, menuState: 'farm_records' };
    case 'farm_log_activity': return { response: RESPONSES.LOG_ACTIVITY_PROMPT, menuState: 'farm_log_activity' };
    case 'farm_log_harvest':  return { response: RESPONSES.LOG_HARVEST_PROMPT, menuState: 'farm_log_harvest' };
    case 'diagnose':          return { response: RESPONSES.DIAGNOSE_PROMPT, menuState: 'diagnose' };
    case 'market_prices':     return { response: RESPONSES.MARKET_PRICES_MENU, menuState: 'market_prices' };
    case 'market_more':       return { response: RESPONSES.MARKET_MORE_MENU, menuState: 'market_more' };
    case 'loans':             return { response: RESPONSES.LOANS_MENU, menuState: 'loans' };
    case 'loan_apply':        return { response: RESPONSES.LOAN_APPLY_PROMPT, menuState: 'loan_apply' };
  }
}
