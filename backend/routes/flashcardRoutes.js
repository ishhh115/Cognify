import express from 'express';
import {
    getFlashcards,
    getAllFlashcardSets,
    reviewFlashcardSet,
    deleteFlashcardSet,
    toggleFlashcardSet,
} from '../controllers/flashcardController.js';
import  { protect }   from '../middleware/auth.js';

const router = express.Router();

//Protected routes  
router.use(protect);
router.get('/', getAllFlashcardSets);
router.get('/:documentId', getFlashcards);
router.put('/:cardId/review', reviewFlashcardSet);
router.put('/:cardId/star', toggleFlashcardSet);
router.delete('/:id', deleteFlashcardSet);

export default router;