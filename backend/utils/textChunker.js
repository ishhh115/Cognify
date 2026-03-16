/**
 *Splits text into chunks for betetr AI processing
    * @param {string} text - Full text to be chunked
    * @param {number} chunkSize - Target size of each chunk { in words }
    * @param {number} overlap - Number of words to overlap between chunks
    * @returns {Array<{content: string,chunkIndex: number,totalChunks: number}>} 
 */
export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    if(!text || text.trim().length === 0) return [];


//clean text while preserving paragraph structure
const cleanedText = text
.replace(/\r\n/g, '\n')
.replace(/\s+/g, ' ')
.replace(/\n+/g, '\n')
.replace(/ \n/g, '\n')
.trim();

//Try to split by paragraphs (single or double newlines)
const paragraphs = cleanedText.split(/\n+/).filter(p => p.trim().length > 0);

const chunks = [];
let currentChunk = [];
let currentWordCount = 0;
let chunkIndex = 0;

for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/);
    const paragraphWordCount = paragraphWords.length;

    //if single paragraph exceeds chunk size, split it directly
    if (paragraphWordCount > chunkSize) {
        if (currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n '),
                chunkIndex: chunkIndex++,
                totalChunks: null
            });
            currentChunk = [];
            currentWordCount = 0;
        }

        //Split large paragraph into word-based chunks with overlap
        for (let i = 0; i < paragraphWordCount; i += chunkSize - overlap) {
            const chunkWords = paragraphWords.slice(i, i + chunkSize);
            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });

            if (i + chunkSize >= paragraphWordCount) break; //last chunk
        }
        continue
    }

    //If adding this paragraph exceeds chunk size, start a new chunk
    if (currentWordCount + paragraphWordCount > chunkSize && currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n '),
            chunkIndex: chunkIndex++,
            totalChunks: null
        });

        //create overlap from previous chunk
        const prevChunkText = currentChunk.join(' ');
        const prevWords = prevChunkText.trim().split(/\s+/);
        const overlapText = prevWords.slice(-Math.min(overlap, prevWords.length)).join(' ');

        currentChunk = [overlapText,paragraph.trim()];
        currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
    } else {
        //Add paragraph to current chunk
        currentChunk.push(paragraph.trim());
        currentWordCount += paragraphWordCount;
    }

    }

//Add the last chunk
if (currentChunk.length > 0) {
    chunks.push({
        content: currentChunk.join('\n\n '),
        chunkIndex: chunkIndex++,
        pageNumber: 0
    });
}

//Fallback: if no chunks created, split by words
if (chunks.length === 0 && cleanedText.length > 0) {
    const allWords = cleanedText.split(/\s+/).filter(w => w.length > 0);
    for (let i = 0; i < allWords.length; i += (chunkSize - overlap)) {
        const chunkWords = allWords.slice(i, i + chunkSize);
        chunks.push({
            content: chunkWords.join(' '),
            chunkIndex: chunkIndex++,
            pageNumber: 0
        });

        if (i + chunkSize >= allWords.length) break; //last chunk
    }
}
return chunks;
};




/**
 * Find relevant chunks based on keyword matching
 * @param {Array<object>} chunks - Array of chunk 
 * @param {string} query - search query or keywords
 * @param {number} maxChunks - Maximum chunks to return
 * @returns {Array<object>} 
 */
export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
    if (!chunks || chunks.length === 0 || !query) {
        return [];
}

//Common stop wordsto exclude from matching
const stopWords = new Set([
    'the', 'is' , 'at', 'which', 'on',  'a', 'an', 'and', 'or' , 'but' ,
     'in', 'with', 'to', 'for', 'of', 'as' , 'by', 'this' , 'that', 'it'
]);

//Extract and clean query keywords
const queryWords = query
.toLowerCase().
split(/\s+/).
filter(w => w.length > 2 && !stopWords.has(w));

if(queryWords.length === 0) {
    //Return clean chunk objects without Mongoose metadata
    return chunks.slice(0, maxChunks).map(chunk => ({
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        _id: chunk._id
    }));
}

const scoredChunks = chunks.map((chunk, index) => {
    const content = chunk.content.toLowerCase();
    const contentWords = content.split(/\s+/).length;
    let score = 0;

    //score each query word
    for (const word of queryWords) {
        //Exact word match(higher score)
        const exactMatches = (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += exactMatches * 3;

        //Partial match (lower score)
        const partialMatches = (content.match(new RegExp(word, 'g')) || []).length;
        score +=Math.max(0, partialMatches - exactMatches) * 1.5;
    }

    //Bonus: Multiple query words in the same chunk
    const uniqueQueryWords = queryWords.filter(word =>
        content.includes(word))
        .length;
        if (uniqueQueryWords > 1) {
            score += uniqueQueryWords * 2;
        }

        //Normalize by content length
        const normalizedScore = score / Math.sqrt(contentWords);

        //small bonus for earlier chunks 
        const positionBonus = 1 - (index / chunks.length) * 0.1;

        //Reurn clean onject without Mongoose metadata
        return {
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id,
            score: normalizedScore * positionBonus,
            rawScore: score,
            matchedWords : uniqueQueryWords
        };
    });

    return scoredChunks
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => { 
        if (b.score !== a.score) {
            return b.score - a.score;
         }
        if(b.matchedWords !== a.matchedWords) {
            return b.matchedWords - a.matchedWords;
        }
        return a.chunkIndex - b.chunkIndex;
    })
    .slice(0, maxChunks);
};
