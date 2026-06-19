import * as priceRepo from '../repositories/priceRepository.js';

export async function getCurrentPrices() {
  return priceRepo.findAllPrices();
}
