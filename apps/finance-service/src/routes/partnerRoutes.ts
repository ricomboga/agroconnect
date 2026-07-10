import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody } from '../middleware/validate.js';
import { createLoanPartnerSchema } from '../schemas/createLoanPartner.schema.js';
import { updateLoanPartnerSchema } from '../schemas/updateLoanPartner.schema.js';
import { listPartners, getPartner, createPartner, updatePartner } from '../controllers/partnerController.js';

const router = Router();

router.get('/', listPartners);
router.get('/:id', getPartner);

// Creation/edits restricted to internal callers (admin panel)
router.post('/', requireServiceToken, validateBody(createLoanPartnerSchema), createPartner);
router.patch('/:id', requireServiceToken, validateBody(updateLoanPartnerSchema), updatePartner);

export { router as partnerRouter };
