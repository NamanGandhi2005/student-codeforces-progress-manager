// server/services/codeforcesAPIService.js
const axios = require('axios');
const crypto = require('crypto');
const Student = require('../models/Student');

const CF_API_BASE = 'https://codeforces.com/api';
const API_CALL_DELAY_MS = 1200; // Delay between API calls

const CF_KEY = process.env.CF_API_KEY;
const CF_SECRET = process.env.CF_API_SECRET;

// Optional: Check if keys are loaded (for initial server startup debugging)
// console.log("DEBUG [CF_SERVICE]: CF_KEY:", CF_KEY ? "Loaded (first 3: " + CF_KEY.substring(0,3) + ")" : "NOT SET");
// console.log("DEBUG [CF_SERVICE]: CF_SECRET:", CF_SECRET ? "Loaded (first 3: " + CF_SECRET.substring(0,3) + ")" : "NOT SET");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates the Codeforces API signature (apiSig).
 */
function generateApiSig(methodName, paramsToSign, apiSecret) {
    const sortedParams = Object.keys(paramsToSign)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(paramsToSign[key])}`)
        .join('&');
    const rand = Math.random().toString(36).substring(2, 8);
    const stringToHash = `${rand}/${methodName}?${sortedParams}#${apiSecret}`;
    // For deep debugging signature issues:
    // console.log(`[CF_SERVICE_DEBUG] Sig Gen - Method: ${methodName}, Rand: ${rand}, Sorted Params: ${sortedParams}`);
    // console.log(`[CF_SERVICE_DEBUG] Sig Gen - String to Hash: ${stringToHash}`);
    const sha512Hash = crypto.createHash('sha512').update(stringToHash).digest('hex');
    return rand + sha512Hash;
}

// --- Non-Authenticated Helper Functions with Robust Error Handling ---
async function fetchUserInfo(handle) {
    await delay(API_CALL_DELAY_MS);
    console.log(`[CF_SERVICE_DEBUG] Attempting to fetch user info for: ${handle}`);
    try {
        const url = `${CF_API_BASE}/user.info?handles=${encodeURIComponent(handle)}`;
        const response = await axios.get(url);
        const responseData = response.data;
        console.log(`[CF_SERVICE_DEBUG] user.info raw response for ${handle}: Status: ${responseData.status}, Result items: ${responseData.result?.length}`);

        if (responseData.status === 'OK' && responseData.result && responseData.result.length > 0) {
            console.log(`[CF_SERVICE_INFO] User info successfully fetched for ${handle}.`);
            return responseData.result[0];
        } else {
            const errorMessage = `User info not found or API error for ${handle}. CF Status: ${responseData.status}, Comment: ${responseData.comment || 'N/A'}`;
            console.error(`[CF_SERVICE_ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    } catch (error) {
        const cfComment = error.response?.data?.comment;
        const httpStatus = error.response?.status;
        const finalErrorMessage = `Exception in fetchUserInfo for ${handle}. ` +
                                  (httpStatus ? `HTTP Status: ${httpStatus}. ` : '') +
                                  (cfComment ? `CF Comment: ${cfComment}. ` : '') +
                                  `Original error: ${error.message}`;
        console.error(`[CF_SERVICE_ERROR] ${finalErrorMessage}`);
        throw new Error(finalErrorMessage);
    }
}

async function fetchUserRatingHistory(handle) {
    await delay(API_CALL_DELAY_MS);
    console.log(`[CF_SERVICE_DEBUG] Attempting to fetch rating history for: ${handle}`);
    try {
        const url = `${CF_API_BASE}/user.rating?handle=${encodeURIComponent(handle)}`;
        const response = await axios.get(url);
        const responseData = response.data;
        console.log(`[CF_SERVICE_DEBUG] user.rating raw response for ${handle}: Status: ${responseData.status}, Result items: ${responseData.result?.length}`);

        if (responseData.status === 'OK' && responseData.result) { // result can be an empty array if no rated contests
            console.log(`[CF_SERVICE_INFO] Rating history successfully fetched for ${handle}. Found ${responseData.result.length} contests.`);
            return responseData.result;
        } else {
            const errorMessage = `Rating history not found or API error for ${handle}. CF Status: ${responseData.status}, Comment: ${responseData.comment || 'N/A'}`;
            console.error(`[CF_SERVICE_ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    } catch (error) {
        const cfComment = error.response?.data?.comment;
        const httpStatus = error.response?.status;
        const finalErrorMessage = `Exception in fetchUserRatingHistory for ${handle}. ` +
                                  (httpStatus ? `HTTP Status: ${httpStatus}. ` : '') +
                                  (cfComment ? `CF Comment: ${cfComment}. ` : '') +
                                  `Original error: ${error.message}`;
        console.error(`[CF_SERVICE_ERROR] ${finalErrorMessage}`);
        throw new Error(finalErrorMessage);
    }
}

async function fetchUserSubmissions(handle, count = 2000) {
    await delay(API_CALL_DELAY_MS);
    console.log(`[CF_SERVICE_DEBUG] Attempting to fetch submissions for: ${handle} (count: ${count})`);
    try {
        const url = `${CF_API_BASE}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=${count}`;
        const response = await axios.get(url);
        const responseData = response.data;
        console.log(`[CF_SERVICE_DEBUG] user.status raw response for ${handle}: Status: ${responseData.status}, Result items: ${responseData.result?.length}`);

        if (responseData.status === 'OK' && responseData.result) {
            console.log(`[CF_SERVICE_INFO] Submissions successfully fetched for ${handle}. Found ${responseData.result.length} submissions (raw).`);
            return responseData.result.map(sub => ({
                id: sub.id,
                contestId: sub.contestId,
                problemName: sub.problem.name,
                problemIndex: sub.problem.index,
                programmingLanguage: sub.programmingLanguage,
                verdict: sub.verdict,
                rating: sub.problem.rating,
                tags: sub.problem.tags || [],
                creationTimeSeconds: sub.creationTimeSeconds,
            }));
        } else {
            const errorMessage = `Submissions not found or API error for ${handle}. CF Status: ${responseData.status}, Comment: ${responseData.comment || 'N/A'}`;
            console.error(`[CF_SERVICE_ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    } catch (error) {
        const cfComment = error.response?.data?.comment;
        const httpStatus = error.response?.status;
        const finalErrorMessage = `Exception in fetchUserSubmissions for ${handle}. ` +
                                  (httpStatus ? `HTTP Status: ${httpStatus}. ` : '') +
                                  (cfComment ? `CF Comment: ${cfComment}. ` : '') +
                                  `Original error: ${error.message}`;
        console.error(`[CF_SERVICE_ERROR] ${finalErrorMessage}`);
        throw new Error(finalErrorMessage);
    }
}

// --- Authenticated Helper Function ---
async function fetchContestStandingsData(contestId, handle) {
    if (!CF_KEY || !CF_SECRET) {
        console.warn(`[CF_SERVICE] API Key/Secret not set. Skipping fetchContestStandingsData for contest ${contestId}, handle ${handle}.`);
        return null;
    }
    await delay(API_CALL_DELAY_MS);
    const methodName = 'contest.standings';
    const requestParamsForSigning = {
        contestId: contestId,
        handles: handle,
        from: 1,
        count: 1, // We only need this user's row
        showUnofficial: true, // Get data even if unofficial participation
        apiKey: CF_KEY,
        time: Math.floor(Date.now() / 1000)
    };
    const apiSig = generateApiSig(methodName, requestParamsForSigning, CF_SECRET);
    const urlParams = { ...requestParamsForSigning, apiSig: apiSig };
    const queryString = Object.keys(urlParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(urlParams[key])}`)
        .join('&');
    
    const url = `${CF_API_BASE}/${methodName}?${queryString}`;
    // console.log(`[CF_SERVICE_DEBUG] Requesting URL (contest.standings): ${url.replace(CF_KEY, "YOUR_KEY").replace(apiSig, apiSig.substring(0,10)+"...")}`);
    
    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK' && response.data.result) {
            console.log(`[CF_SERVICE_INFO] Standings data fetched for contest ${contestId}, handle ${handle}. Problems: ${response.data.result.problems?.length}, Rows: ${response.data.result.rows?.length}`);
            return response.data.result; // Contains { contest, problems, rows }
        }
        console.error(`[CF_SERVICE_ERROR] Error fetching standings for contest ${contestId}, handle ${handle}: ${response.data.comment || response.data.status}`);
        return null;
    } catch (error) {
        const errorMsg = error.response?.data?.comment || error.message;
        const status = error.response?.status;
        console.error(`[CF_SERVICE_ERROR] Exception fetching standings for contest ${contestId}, handle ${handle} (Status: ${status}): ${errorMsg}`);
        // console.error("[CF_SERVICE_DEBUG] Failed URL (standings):", error.config?.url);
        return null;
    }
}

// --- Main Sync Function ---
async function fetchAndSaveStudentCFData(handle) {
    console.log(`[CF_SERVICE] Starting FULL CF data sync for handle: ${handle}`);
    const student = await Student.findOne({ codeforcesHandle: handle });
    if (!student) {
        console.error(`[CF_SERVICE_ERROR] Student with handle ${handle} not found in DB. Cannot sync.`);
        // Consider if this should throw or just return null for the controller to handle
        throw new Error(`Student with handle ${handle} not found in DB.`);
    }

    try {
        await Student.updateOne({ _id: student._id }, { syncStatus: 'pending', syncErrorMessage: null });

        // These calls will now throw more reliably if they fail to get proper data
        const userInfo = await fetchUserInfo(handle); // Must return valid user object or throw
        const ratingHistory = await fetchUserRatingHistory(handle); // Must return array or throw
        const submissionsData = await fetchUserSubmissions(handle); // Must return array or throw

        // If we reach here, userInfo, ratingHistory, and submissionsData are guaranteed to be valid (not undefined)
        student.currentRating = userInfo.rating || 0;
        student.maxRating = userInfo.maxRating || 0;

        const processedContests = [];
        if (ratingHistory && ratingHistory.length > 0) {
            for (const contestAPIData of ratingHistory) {
                const existingContestEntry = student.codeforcesData.contests.find(
                    c => c.contestId === contestAPIData.contestId && c.ratingUpdatedAtSeconds === contestAPIData.ratingUpdateTimeSeconds
                );
                
                let problemsSolvedByUser = existingContestEntry?.problemsSolvedByUser || 0;
                let totalProblemsInContest = existingContestEntry?.totalProblemsInContest || 0;
                let detailsSyncedInLoop = existingContestEntry?.contestDetailsSynced || false; // Use a distinct name for clarity

                if (CF_KEY && CF_SECRET && !detailsSyncedInLoop) {
                    console.log(`[CF_SERVICE_INFO] Fetching standings & problem data for contest ${contestAPIData.contestId} (user: ${handle})`);
                    const standingsFullData = await fetchContestStandingsData(contestAPIData.contestId, handle);

                    if (standingsFullData && standingsFullData.problems) {
                        totalProblemsInContest = standingsFullData.problems.length;
                    }
                    if (standingsFullData && standingsFullData.rows && standingsFullData.rows.length > 0) {
                        const userStandingsRow = standingsFullData.rows[0];
                        if (userStandingsRow.problemResults) {
                             problemsSolvedByUser = userStandingsRow.problemResults.filter(pr => pr.points > 0 || (pr.bestSubmissionTimeSeconds !== undefined && pr.bestSubmissionTimeSeconds !== null)).length;
                        }
                    }
                    detailsSyncedInLoop = true; // Mark as attempted/synced for this iteration
                }

                processedContests.push({
                    contestId: contestAPIData.contestId,
                    contestName: contestAPIData.contestName,
                    handle: contestAPIData.handle,
                    rank: contestAPIData.rank,
                    oldRating: contestAPIData.oldRating,
                    newRating: contestAPIData.newRating,
                    ratingUpdatedAtSeconds: contestAPIData.ratingUpdateTimeSeconds,
                    problemsSolvedByUser: problemsSolvedByUser,
                    totalProblemsInContest: totalProblemsInContest,
                    contestDetailsSynced: detailsSyncedInLoop // Use the loop's flag
                });
            }
        }
        student.codeforcesData.contests = processedContests.sort((a, b) => b.ratingUpdatedAtSeconds - a.ratingUpdatedAtSeconds);
        student.codeforcesData.submissions = submissionsData.sort((a,b) => b.creationTimeSeconds - b.creationTimeSeconds);

        if (student.codeforcesData.submissions.length > 0) {
            student.lastSubmissionTimestampSeconds = student.codeforcesData.submissions[0].creationTimeSeconds;
        } else {
            student.lastSubmissionTimestampSeconds = null;
        }
        student.lastSyncedAt = new Date();
        student.syncStatus = 'success';
        student.syncErrorMessage = null;

        await student.save();
        console.log(`[CF_SERVICE_INFO] Successfully synced and saved CF data for ${handle}. Processed ${processedContests.length} contests.`);
        return student;

    } catch (error) {
        console.error(`[CF_SERVICE_ERROR] CRITICAL Error during CF data sync for ${handle}: ${error.message}`, error.stack);
        // Attempt to update student status to 'failed' even if other parts of the sync failed
        try {
            const studentToUpdateOnError = await Student.findById(student._id); // Use findById if student object might be stale
            if (studentToUpdateOnError) {
                studentToUpdateOnError.lastSyncedAt = new Date();
                studentToUpdateOnError.syncStatus = 'failed';
                studentToUpdateOnError.syncErrorMessage = error.message.substring(0, 500);
                await studentToUpdateOnError.save();
            }
        } catch (saveError) {
            console.error(`[CF_SERVICE_ERROR] Failed to update student sync status to 'failed' for ${handle}: ${saveError.message}`);
        }
        throw error; // Re-throw original error so the caller (e.g., controller) knows about the failure
    }
}

module.exports = { fetchAndSaveStudentCFData,
    fetchUserInfo
 };