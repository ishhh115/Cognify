import  Document  from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';

// @desc    Upload a new document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                 error: 'Please upload a file',
                statusCode: 400
            });
        }

        const { title } = req.body;

        if(!title) {
            //Delete uploaded file if title is missing
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Please provide a title for the document',
                statusCode: 400
            });
        }

        //construct the URL for the uploaded file
        const baseUrl = `http://localhost:${process.env.PORT || 8000}`;
        const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

        //create document record in database
        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.originalname,
            filePath: fileUrl,
            fileSize: req.file.size,
            status: 'processing'
        });


        //process PDF in background (in production consider using a job queue like Bull )
        processPDF(document._id, req.file.path).catch( (err) => {
            console.error('Error processing PDF:', err);
        });

        res.status(201).json({
            success: true,
            data: document,
            message: 'Document uploaded successfully and is being processed',
        });
    
 


    } catch (error) {
        //clean up uploaded file if error occurs
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
    }
};

//Hellper function to process PDF
const processPDF = async (documentId, filePath) => {
    try {
        const { text } = await extractTextFromPDF(filePath);

        //Create chunks
        const chunks = chunkText(text, 500, 50); //chunk size of 500 words with 50 word overlap

        //Update document with extracted text and chunks
        await Document.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks: chunks,
            status: 'ready'
        });

        console.log(`Document ${documentId} processed successfully`);
    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        await Document.findByIdAndUpdate(documentId, { status: 'error' 

        });
    }
};

// @desc    Get all user documents
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {     
    try {
        const documents = await Document.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user._id) }
         },
         {
            $lookup: {
                from: 'flashcards',
                localField: '_id',
                foreignField: 'documentId',
                as: 'flashcards'
            }
         },
         {
            $lookup: {
                from: 'quizzes',
                localField: '_id',
                foreignField: 'documentId',
                as: 'quizzes'
            }
        },
        {
            $addFields: {
                flashcardCount: { $size: '$flashcards' },
                quizCount: { $size: '$quizzes' }
            }
        },
        { $project: {
                flashcards: 0,
                quizzes: 0
            }
        },
        { 
            $sort: { uploadDate: -1 } 
    }
    ]);

    res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
    });
    } catch (error) {
        next(error);
    }   



};

// @desc    Get a single document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {

};

// @desc    Delete a document by ID
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {

};

// @desc    Update a document by ID
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res, next) => {

};

