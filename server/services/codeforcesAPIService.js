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
    let student = await Student.findOne({ codeforcesHandle: handle }); // Get initial student doc

    if (!student) {
        console.error(`[CF_SERVICE_ERROR] Student with handle ${handle} not found in DB. Cannot sync.`);
        throw new Error(`Student with handle ${handle} not found in DB.`);
    }

    try {
        // Mark sync as pending initially
        student.syncStatus = 'pending';
        student.syncErrorMessage = null;
        // student.lastSyncedAt = new Date(); // Or update this only at the very end
        await student.save(); // Save pending status

        // These calls will now throw more reliably if they fail to get proper data
        const userInfo = await fetchUserInfo(handle);
        const ratingHistoryFromAPI = await fetchUserRatingHistory(handle); // Fresh contest list from API
        const submissionsData = await fetchUserSubmissions(handle);

        // Update basic info from userInfo
        student.currentRating = userInfo.rating || 0;
        student.maxRating = userInfo.maxRating || 0;

        // --- Process Contests: Merge API data with existing DB data and save progressively ---
        // First, ensure the student.codeforcesData.contests array reflects all contests from ratingHistoryFromAPI
        // This is a simplified merge: assumes ratingHistoryFromAPI is the source of truth for the list of contest participations.
        // More complex merging would be needed if contests could be removed or if details other than problem counts change.
        
        const contestMapFromDB = new Map(student.codeforcesData.contests.map(c => [`${c.contestId}-${c.ratingUpdatedAtSeconds}`, c]));
        const newContestArray = [];
        let basicContestListChanged = false;

        if (ratingHistoryFromAPI && ratingHistoryFromAPI.length > 0) {
            for (const contestAPIData of ratingHistoryFromAPI) {
                const key = `${contestAPIData.contestId}-${contestAPIData.ratingUpdatedAtSeconds}`;
                const existingDBEntry = contestMapFromDB.get(key);

                newContestArray.push({
                    contestId: contestAPIData.contestId,
                    contestName: contestAPIData.contestName,
                    handle: contestAPIData.handle,
                    rank: contestAPIData.rank,
                    oldRating: contestAPIData.oldRating,
                    newRating: contestAPIData.newRating,
                    ratingUpdatedAtSeconds: contestAPIData.ratingUpdateTimeSeconds,
                    // Preserve existing details if present, otherwise default
                    problemsSolvedByUser: existingDBEntry?.problemsSolvedByUser || 0,
                    totalProblemsInContest: existingDBEntry?.totalProblemsInContest || 0,
                    contestDetailsSynced: existingDBEntry?.contestDetailsSynced || false,
                });
                if (!existingDBEntry) basicContestListChanged = true; // A new contest participation was added
            }
        }
        
        // If the structure of the contest list changed (e.g., new contests added)
        if (basicContestListChanged || student.codeforcesData.contests.length !== newContestArray.length) {
            student.codeforcesData.contests = newContestArray.sort((a, b) => b.ratingUpdatedAtSeconds - a.ratingUpdatedAtSeconds);
            student.markModified('codeforcesData.contests');
        }
        // Save submissions once
        student.codeforcesData.submissions = submissionsData.sort((a,b) => b.creationTimeSeconds - b.creationTimeSeconds);
        student.markModified('codeforcesData.submissions');

        if (student.codeforcesData.submissions.length > 0) {
            student.lastSubmissionTimestampSeconds = student.codeforcesData.submissions[0].creationTimeSeconds;
        } else {
            student.lastSubmissionTimestampSeconds = null;
        }

        // Save after updating basic info, contest shells, and all submissions
        // This makes the initial list of contests available to the frontend poll
        await student.save();
        console.log(`[CF_SERVICE_INFO] Saved initial data & contest shells for ${handle}. Now fetching contest details.`);

        // Now, iterate through the student's contests (which are now up-to-date with shells)
        // and fetch details if needed, saving after each successful detail fetch.
        if (CF_KEY && CF_SECRET) {
            for (let i = 0; i < student.codeforcesData.contests.length; i++) {
                let contestEntry = student.codeforcesData.contests[i]; // This is a subdocument reference

                if (!contestEntry.contestDetailsSynced) {
                    console.log(`[CF_SERVICE_INFO] Fetching details for contest ${contestEntry.contestId} (user: ${handle})`);
                    const standingsFullData = await fetchContestStandingsData(contestEntry.contestId, handle);

                    if (standingsFullData) {
                        if (standingsFullData.problems) {
                            contestEntry.totalProblemsInContest = standingsFullData.problems.length;
                        }
                        if (standingsFullData.rows && standingsFullData.rows.length > 0) {
                            const userRow = standingsFullData.rows[0];
                            if (userRow.problemResults) {
                                contestEntry.problemsSolvedByUser = userRow.problemResults.filter(pr => pr.points > 0 || (pr.bestSubmissionTimeSeconds != null)).length;
                            }
                        }
                        contestEntry.contestDetailsSynced = true;
                        console.log(`[CF_SERVICE_DEBUG] Contest ${contestEntry.contestId} details updated: S/T: ${contestEntry.problemsSolvedByUser}/${contestEntry.totalProblemsInContest}`);
                        
                        // Save after updating this contest's details to make it visible to polling frontend
                        student.markModified(`codeforcesData.contests.${i}`); 
                        await student.save();
                        console.log(`[CF_SERVICE_DEBUG] Saved progress after contest ${contestEntry.contestId}`);
                    } else {
                        console.warn(`[CF_SERVICE_WARN] No standings data for contest ${contestEntry.contestId}. Details not updated for this attempt.`);
                        // contestDetailsSynced remains false, will be retried next time
                    }
                }
            }
        }
        
        // Final update for overall status and lastSyncedAt
        student.lastSyncedAt = new Date();
        student.syncStatus = 'success';
        student.syncErrorMessage = null;
        await student.save(); // Final save
        console.log(`[CF_SERVICE_INFO] Successfully completed FULL CF data sync for ${handle}.`);
        return student; // Return the fully updated student

    } catch (error) {
        console.error(`[CF_SERVICE_ERROR] CRITICAL Error during CF data sync for ${handle}: ${error.message}`, error.stack);
        try {
            // Re-fetch student to avoid saving potentially partially modified state from within the try block
            const studentToUpdateOnError = await Student.findOne({ codeforcesHandle: handle });
            if (studentToUpdateOnError) {
                studentToUpdateOnError.lastSyncedAt = new Date(); // Mark sync attempt time
                studentToUpdateOnError.syncStatus = 'failed';
                studentToUpdateOnError.syncErrorMessage = error.message.substring(0, 500);
                await studentToUpdateOnError.save();
            }
        } catch (saveError) {
            console.error(`[CF_SERVICE_ERROR] Failed to update student sync status to 'failed' for ${handle}: ${saveError.message}`);
        }
        throw error;
    }
}

module.exports = { fetchAndSaveStudentCFData,
    fetchUserInfo
 };