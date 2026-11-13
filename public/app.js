
'use strict';

/* =========================================================
   RAVENSHAW UNIVERSITY - INDIAN KNOWLEDGE SYSTEM
   RUIKS FRONTEND APPLICATION
   Backend: Node.js + Express + TiDB Cloud + Cloudinary
   ========================================================= */

const API = '/api';

let token = localStorage.getItem('ruiks_token') || '';
let user = null;
let mode = 'login';

let qnum = 0;
let chosen = {};
let examTimer = null;
let activeExamId = null;
let submitting = false;
let initialized = false;
let activePage = 'Home';
let activeConversation = null;
let refreshTimer = null;

let activeHabitCategory = null;
let activeMediaFilter = 'all';
let lightboxItems = [];
let lightboxIndex = 0;

const $ = selector => document.querySelector(selector);

const departments = [
    'Odia', 'English', 'History', 'BCA', 'MCA', 'BBA', 'MBA',
    'ITM', 'Computer Science', 'Economics', 'Zoology', 'Botany',
    'Microbiology', 'Education', 'Physics', 'Chemistry', 'Commerce',
    'Philosophy', 'Mathematics', 'Statistics', 'Psychology',
    'Journalism and Mass Communication'
];

/* =========================================================
   HABITUP PERMANENT CATEGORIES
   ========================================================= */

const HABITUP_CATEGORIES = [
    { title: 'Daily Exercises', slug: 'daily-exercises', icon: '🏃', odiaTitle: 'ଦୈନିକ ବ୍ୟାୟାମ ଓ ସକ୍ରିୟ ଜୀବନ', image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଦୈନିକ ବ୍ୟାୟାମ ଶରୀରକୁ ସଚଳ ରଖିବା, ମନକୁ ସତେଜ କରିବା ଏବଂ ନିୟମିତ ଜୀବନଶୈଳୀ ଗଢ଼ିବାର ଏକ ସରଳ ଉପାୟ। ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଦୀର୍ଘ ସମୟ ପଢ଼ା, କମ୍ପ୍ୟୁଟର ସାମ୍ନାରେ ବସିବା ଓ ଯାତାୟାତ ଯୋଗୁଁ ଶରୀରର ଚଳନ କମିଯାଇପାରେ। ହାଟିବା, ହାଲୁକା ଦୌଡ଼, ସାଇକେଲ ଚଳାଇବା, ସିଢ଼ି ଚଢ଼ିବା ଓ ସହଜ ଷ୍ଟ୍ରେଚିଂ ଦ୍ୱାରା ଦିନରେ ଗତିଶୀଳତା ବଢ଼ାଯାଇପାରେ। ଆରମ୍ଭରେ ଅଳ୍ପ ସମୟ ଧରି ଅଭ୍ୟାସ କରି ଧୀରେ ଧୀରେ ସମୟ ବଢ଼ାଇବା ଉଚିତ। ନିଜ ଶାରୀରିକ କ୍ଷମତା, ବୟସ, ପରିବେଶ ଓ ସ୍ୱାସ୍ଥ୍ୟ ଅନୁଯାୟୀ ଅଭ୍ୟାସ ବାଛନ୍ତୁ। ବ୍ୟାୟାମକୁ ଦଣ୍ଡ କିମ୍ବା ଓଜନ କମାଇବାର ଚାପ ଭାବେ ନୁହେଁ, ନିଜ ଶରୀରର ଯତ୍ନ ଭାବେ ଦେଖନ୍ତୁ।' },
    { title: 'Yoga', slug: 'yoga', icon: '🧘', odiaTitle: 'ଯୋଗ: ଶରୀର, ଶ୍ୱାସ ଓ ମନର ସମନ୍ୱୟ', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଯୋଗ ଭାରତୀୟ ଜ୍ଞାନ ପରମ୍ପରାର ଏକ ବ୍ୟାପକ ଅଭ୍ୟାସ, ଯେଉଁଥିରେ ଶରୀରର ଆସନ, ଶ୍ୱାସ ପ୍ରତି ସଚେତନତା ଓ ମନୋନିବେଶକୁ ଏକାଠି ଆଣାଯାଏ। ଏହା କେବଳ କଠିନ ଆସନ କରିବା ନୁହେଁ; ନିଜ ଶରୀରର ସୀମା ବୁଝିବା, ଧୈର୍ଯ୍ୟ ରଖିବା ଓ ନିୟମିତତା ଗଢ଼ିବା ମଧ୍ୟ ଯୋଗର ଅଂଶ। ଛାତ୍ରଛାତ୍ରୀ ସହଜ ତାଡ଼ାସନ, ବୃକ୍ଷାସନ, ଭୁଜଙ୍ଗାସନ ପରି ମୌଳିକ ଆସନ ଶିକ୍ଷକଙ୍କ ନିର୍ଦ୍ଦେଶରେ ଶିଖିପାରନ୍ତି। ଯନ୍ତ୍ରଣା ହେଲେ ଜୋର କରିବା ଉଚିତ ନୁହେଁ। ଯୋଗକୁ ଧର୍ମୀୟ ଚାପ ଭାବେ ନୁହେଁ, ଏକ ସାଂସ୍କୃତିକ ଓ ଶାରୀରିକ ଅଭ୍ୟାସ ଭାବେ ସମ୍ମାନ ସହ ଅଧ୍ୟୟନ କରାଯାଇପାରେ।' },
    { title: 'Pranayama', slug: 'pranayama', icon: '🌬️', odiaTitle: 'ପ୍ରାଣାୟାମ: ଶ୍ୱାସ ପ୍ରତି ସଚେତନତା', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ପ୍ରାଣାୟାମ ଯୋଗ ପରମ୍ପରାରେ ଶ୍ୱାସର ଗତି, ଲୟ ଓ ସଚେତନ ନିୟନ୍ତ୍ରଣ ସହ ଜଡ଼ିତ ଅଭ୍ୟାସ। ଶ୍ୱାସ ଆମ ଜୀବନର ସ୍ୱାଭାବିକ ପ୍ରକ୍ରିୟା ହେଲେ ମଧ୍ୟ ଦୈନନ୍ଦିନ ଚାପରେ ଆମେ ତାହାକୁ ଧ୍ୟାନ ଦେଉନାହୁଁ। ଶାନ୍ତ ଭାବରେ ବସି ନିଜର ସ୍ୱାଭାବିକ ଶ୍ୱାସକୁ ଅବଲୋକନ କରିବା ଏକ ସୁରକ୍ଷିତ ଆରମ୍ଭ। ଅନୁଲୋମ ବିଲୋମ ପରି ପ୍ରକ୍ରିୟା ଶିକ୍ଷକଙ୍କଠାରୁ ଶିଖିବା ଉଚିତ। ଦୀର୍ଘ ସମୟ ଶ୍ୱାସ ଅଟକାଇବା, ଜୋରରେ ଶ୍ୱାସ ନେବା କିମ୍ବା ଅସୁବିଧା ହେଲେ ଅଭ୍ୟାସ ଜାରି ରଖିବା ଠିକ୍ ନୁହେଁ। ଶ୍ୱାସକୁ ଶାନ୍ତିରେ ଅନୁଭବ କରିବା ହିଁ ଏହି ଶିକ୍ଷାର ମୂଳ।' },
    { title: 'Mindful Meditation', slug: 'mindful-meditation', icon: '🪷', odiaTitle: 'ମାଇଣ୍ଡଫୁଲ୍ ଧ୍ୟାନ ଓ ବର୍ତ୍ତମାନରେ ରହିବା', image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ମାଇଣ୍ଡଫୁଲ୍ ଧ୍ୟାନ ମାନେ ବର୍ତ୍ତମାନ ମୁହୂର୍ତ୍ତର ଅନୁଭବକୁ ବିଚାର ନକରି ଧ୍ୟାନ ଦେବା। ଏଥିରେ ଶ୍ୱାସ, ଶରୀରର ଅନୁଭୂତି, ଶବ୍ଦ କିମ୍ବା ଚିନ୍ତାକୁ ଲକ୍ଷ୍ୟ କରାଯାଏ। ଚିନ୍ତା ଆସିଲେ ନିଜକୁ ଦୋଷ ନଦେଇ ପୁଣି ଧ୍ୟାନକୁ ଫେରାଇବା ଅଭ୍ୟାସର ଅଂଶ। ପ୍ରଥମେ ଦୁଇରୁ ପାଞ୍ଚ ମିନିଟ୍ ଶାନ୍ତ ସ୍ଥାନରେ ବସି ଅଭ୍ୟାସ କରିପାରିବେ। ଧ୍ୟାନର ଲକ୍ଷ୍ୟ ମନକୁ ସମ୍ପୂର୍ଣ୍ଣ ଖାଲି କରିବା ନୁହେଁ; ନିଜ ଧ୍ୟାନ କେଉଁଠି ଯାଉଛି ତାହା ବୁଝିବା। ଅସୁବିଧା ଅନୁଭବ ହେଲେ ଆଖି ଖୋଲନ୍ତୁ, ଚାରିପାଖକୁ ଧ୍ୟାନ ଦିଅନ୍ତୁ ଓ ଆବଶ୍ୟକ ହେଲେ ବିରତି ନିଅନ୍ତୁ।' },
    { title: 'Breathing Exercises', slug: 'breathing-exercises', icon: '🌿', odiaTitle: 'ସହଜ ଶ୍ୱାସ ଅଭ୍ୟାସ', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଶ୍ୱାସ ଅଭ୍ୟାସର ମୂଳ ଉଦ୍ଦେଶ୍ୟ ହେଉଛି ନିଜର ସ୍ୱାଭାବିକ ଶ୍ୱାସକୁ ଧ୍ୟାନ ଦେବା ଓ ଶରୀରକୁ ଅତିରିକ୍ତ ଚାପ ନଦେବା। ଧୀରେ ଶ୍ୱାସ ନେବା, ଶ୍ୱାସ ବାହାର କରିବାର ଅନୁଭବକୁ ଲକ୍ଷ୍ୟ କରିବା ଏବଂ ସୁବିଧାଜନକ ଲୟ ରଖିବା ଆରମ୍ଭ ପାଇଁ ଯଥେଷ୍ଟ। ଛାତ୍ରଛାତ୍ରୀ ପରୀକ୍ଷା ପୂର୍ବରୁ କିମ୍ବା ଦୀର୍ଘ ସମୟ ପଢ଼ା ପରେ କିଛି ମୁହୂର୍ତ୍ତ ବିରତି ନେଇ ଏହା କରିପାରନ୍ତି। ମୁଣ୍ଡ ଘୁରିବା, ଛାତିରେ ଅସୁବିଧା କିମ୍ବା ଶ୍ୱାସକଷ୍ଟ ହେଲେ ତୁରନ୍ତ ବନ୍ଦ କରନ୍ତୁ। ଶ୍ୱାସ ଅଭ୍ୟାସ ଚିକିତ୍ସାର ବିକଳ୍ପ ନୁହେଁ; ଅସୁସ୍ଥତା ଥିଲେ ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ।' },
    { title: 'Chakra Healing', slug: 'chakra-healing', icon: '🔆', odiaTitle: 'ଚକ୍ର ଧାରଣା: ଯୋଗ ପରମ୍ପରାର ଏକ ଅଧ୍ୟୟନ', image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଚକ୍ର ଧାରଣା ଭାରତୀୟ ଯୋଗ ଓ ତାନ୍ତ୍ରିକ ପରମ୍ପରାର କିଛି ଗ୍ରନ୍ଥରେ ମିଳୁଥିବା ଏକ ପ୍ରତୀକାତ୍ମକ ଶରୀର-ମାନଚିତ୍ର। ଏହାକୁ ବିଭିନ୍ନ ପରମ୍ପରାରେ ଭିନ୍ନ ଭାବରେ ବ୍ୟାଖ୍ୟା କରାଯାଇଛି। ଏହି ବିଷୟକୁ ଐତିହାସିକ, ସାଂସ୍କୃତିକ ଓ ଦାର୍ଶନିକ ଦୃଷ୍ଟିରୁ ଅଧ୍ୟୟନ କରିବା ଉଚିତ। ରଙ୍ଗ, ପ୍ରତୀକ, ଧ୍ୟାନ ଓ ଆତ୍ମପର୍ଯ୍ୟବେକ୍ଷଣ କେତେକ ଅଭ୍ୟାସର ଅଂଶ ହୋଇପାରେ। କିନ୍ତୁ ଚକ୍ର ଅଭ୍ୟାସ ଶାରୀରିକ ରୋଗ ସୁସ୍ଥ କରେ କିମ୍ବା ଶରୀରରେ ମାପିପାରିବା ଶକ୍ତିକେନ୍ଦ୍ର ଅଛି ବୋଲି ପ୍ରମାଣିତ ଦାବି କରିବା ଠିକ୍ ନୁହେଁ। ଏହାକୁ ବିଶ୍ୱାସ, ପରମ୍ପରା ଓ ବ୍ୟକ୍ତିଗତ ଅନୁଭବର ଅଧ୍ୟୟନ ଭାବେ ନିଅନ୍ତୁ।' },
    { title: 'Overcoming Limerence', slug: 'overcoming-limerence', icon: '💚', odiaTitle: 'ଅତ୍ୟଧିକ ଆସକ୍ତିରୁ ସନ୍ତୁଳନକୁ', image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଲିମେରେନ୍ସ ଶବ୍ଦଟି କେତେକ ମନୋବୈଜ୍ଞାନିକ ଆଲୋଚନାରେ ଜଣେ ବ୍ୟକ୍ତି ପ୍ରତି ଅତ୍ୟଧିକ ଚିନ୍ତା, ଆଶା ଓ ଭାବନାତ୍ମକ ଆସକ୍ତିକୁ ବୁଝାଇବା ପାଇଁ ବ୍ୟବହୃତ ହୁଏ। ଏହାକୁ ନିଜେ ନିଜର ରୋଗ ନିର୍ଣ୍ଣୟ ଭାବେ ଧରିବା ଉଚିତ ନୁହେଁ। ଯଦି ଏପରି ଚିନ୍ତା ପଢ଼ା, ନିଦ୍ରା, ସମ୍ପର୍କ କିମ୍ବା ଦୈନନ୍ଦିନ କାମକୁ ପ୍ରଭାବିତ କରୁଛି, ତେବେ ନିଜ ଅନୁଭବକୁ ଲେଖିବା, ସୀମା ନିର୍ଦ୍ଧାରଣ କରିବା, ସୋସିଆଲ୍ ମିଡିଆ ଯାଞ୍ଚ କମାଇବା ଓ ନିଜ ରୁଚିରେ ସମୟ ଦେବା ସହାୟକ ହୋଇପାରେ। ଅନ୍ୟ ବ୍ୟକ୍ତିଙ୍କ ସ୍ୱାଧୀନତା ଓ ସମ୍ମତିକୁ ସମ୍ମାନ କରିବା ଆବଶ୍ୟକ। ଦୁଃଖ ଦୀର୍ଘସ୍ଥାୟୀ ହେଲେ କାଉନସେଲରଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ।' },
    { title: 'Rewire Your Brain', slug: 'rewire-your-brain', icon: '🧠', odiaTitle: 'ମସ୍ତିଷ୍କର ଶିକ୍ଷଣ ଓ ନୂଆ ଅଭ୍ୟାସ', image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ମସ୍ତିଷ୍କର ନ୍ୟୁରୋପ୍ଲାଷ୍ଟିସିଟି ମାନେ ଅନୁଭବ, ଅଭ୍ୟାସ ଓ ଶିକ୍ଷା ଅନୁସାରେ ସ୍ନାୟୁ ଜାଲରେ ପରିବର୍ତ୍ତନ ହେବାର କ୍ଷମତା। ଏହି ଧାରଣା ଆମକୁ ମନେ ପକାଏ ଯେ ନୂଆ କୌଶଳ ଶିଖିବା, ଭାଷା ଅଭ୍ୟାସ, ସଙ୍ଗୀତ, ଗଣିତ କିମ୍ବା ନିୟମିତ ପଢ଼ା ଧୀରେ ଧୀରେ ଉନ୍ନତ ହୋଇପାରେ। ଏହା ତୁରନ୍ତ ମସ୍ତିଷ୍କ ବଦଳାଇଦେବାର ଜାଦୁ ନୁହେଁ। ଛୋଟ ଲକ୍ଷ୍ୟ, ପୁନରାବୃତ୍ତି, ପର୍ଯ୍ୟାପ୍ତ ନିଦ୍ରା, ବିରତି ଓ ଭୁଲରୁ ଶିଖିବା ଏହି ପ୍ରକ୍ରିୟାକୁ ସହାୟତା କରେ। ନିଜର ଅଗ୍ରଗତିକୁ ସପ୍ତାହକୁ ଥରେ ଲେଖନ୍ତୁ ଏବଂ ଅନ୍ୟଙ୍କ ସହ ତୁଳନା ନକରି ନିଜ ପୂର୍ବ ଅବସ୍ଥା ସହ ତୁଳନା କରନ୍ତୁ।' },
    { title: 'Engite', slug: 'engite', icon: '🔥', odiaTitle: 'ଉତ୍ସାହ, ପ୍ରେରଣା ଓ ଲକ୍ଷ୍ୟ ନିର୍ମାଣ', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଏହି ବିଭାଗରେ ଉତ୍ସାହକୁ ଦୀର୍ଘସ୍ଥାୟୀ କାର୍ଯ୍ୟରେ ପରିଣତ କରିବା ବିଷୟରେ ଆଲୋଚନା ହେବ। ପ୍ରେରଣା ସବୁଦିନ ସମାନ ରହେନାହିଁ; ତେଣୁ ଛୋଟ ଲକ୍ଷ୍ୟ, ସ୍ପଷ୍ଟ ସମୟସୀମା ଓ ଦୈନିକ ଅଭ୍ୟାସ ଅଧିକ ଉପଯୋଗୀ। ଛାତ୍ରଛାତ୍ରୀ ଏକ ସପ୍ତାହର ଲକ୍ଷ୍ୟ ଲେଖି ତାହାକୁ ଦିନକୁ ଦିନ ଭାଗ କରିପାରନ୍ତି। ନିଜକୁ ଅତ୍ୟଧିକ ଚାପ ଦେବା ବଦଳରେ ସଫଳତା ଓ ବିଫଳତା ଉଭୟରୁ ଶିଖନ୍ତୁ। ବିଶ୍ରାମ, ସହଯୋଗ ଓ ବାସ୍ତବ ଆଶା ମଧ୍ୟ ଉତ୍ପାଦକତାର ଅଂଶ। ପ୍ରେରଣାଦାୟକ କଥାକୁ କାର୍ଯ୍ୟଯୋଜନା ସହ ଯୋଡ଼ିଲେ ଏହା ଦୈନନ୍ଦିନ ଜୀବନରେ ଅର୍ଥପୂର୍ଣ୍ଣ ହୁଏ।' },
    { title: 'Self-Hypnosis', slug: 'self-hypnosis', icon: '✨', odiaTitle: 'ସେଲ୍ଫ-ହିପ୍ନୋସିସ୍: ଧ୍ୟାନ ଓ କଳ୍ପନାର ଅଭ୍ୟାସ', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ସେଲ୍ଫ-ହିପ୍ନୋସିସ୍ ଶବ୍ଦଟି ଶାନ୍ତ ଧ୍ୟାନ, ନିର୍ଦ୍ଦେଶିତ କଳ୍ପନା ଓ ଧ୍ୟାନ କେନ୍ଦ୍ରିତ କରିବାର କିଛି ପ୍ରକ୍ରିୟାକୁ ବୁଝାଇପାରେ। ଏହାର ଅର୍ଥ ନିଜ ଉପରେ ନିୟନ୍ତ୍ରଣ ହରାଇବା ନୁହେଁ। କେତେକ ଲୋକ ଏହାକୁ ମଞ୍ଚଭୀତି କିମ୍ବା ପ୍ରଦର୍ଶନ ପୂର୍ବରୁ ମନକୁ ଶାନ୍ତ କରିବା ପାଇଁ ଅଭ୍ୟାସ କରନ୍ତି, କିନ୍ତୁ ପ୍ରଭାବ ବ୍ୟକ୍ତିଭେଦେ ଭିନ୍ନ ହୋଇପାରେ। ସରଳ ନିର୍ଦ୍ଦେଶିତ ଅଭ୍ୟାସ କରିବାବେଳେ ସୁରକ୍ଷିତ ସ୍ଥାନ ବାଛନ୍ତୁ, ଗାଡ଼ି ଚଳାଇବା ସମୟରେ କେବେ କରନ୍ତୁ ନାହିଁ ଏବଂ ଅସୁବିଧା ହେଲେ ବନ୍ଦ କରନ୍ତୁ। ଏହା ଚିକିତ୍ସାର ବିକଳ୍ପ ନୁହେଁ; ମନୋସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ପାଇଁ ଯୋଗ୍ୟ ବିଶେଷଜ୍ଞଙ୍କୁ ଦେଖନ୍ତୁ।' },
    { title: 'EFT (Emotional Freedom Technique)', slug: 'eft', icon: '🤲', odiaTitle: 'ଇଏଫ୍ଟି: ଭାବନାକୁ ଚିହ୍ନିବା ଓ ଆତ୍ମପର୍ଯ୍ୟବେକ୍ଷଣ', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ଇମୋସନାଲ୍ ଫ୍ରିଡମ୍ ଟେକ୍ନିକ୍ ବା EFT କେତେକ ସ୍ୱୟଂସହାୟତା ଗୋଷ୍ଠୀରେ ଟ୍ୟାପିଂ ଓ ଭାବନାକୁ ଶବ୍ଦରେ ବ୍ୟକ୍ତ କରିବା ସହ ଯୋଡ଼ାଯାଏ। ଏହାର ବୈଜ୍ଞାନିକ ପ୍ରମାଣ ସୀମିତ ଓ ଭିନ୍ନ ମାନର; ତେଣୁ ଏହାକୁ ସମସ୍ତ ସମସ୍ୟାର ନିଶ୍ଚିତ ଉପଚାର ବୋଲି ଧରିବା ଉଚିତ ନୁହେଁ। ଏହି ବିଭାଗରେ ଭାବନାକୁ ଚିହ୍ନିବା, ଚାପର କାରଣ ଲେଖିବା, ସୁରକ୍ଷିତ ଭାବରେ ନିଜକୁ ସାନ୍ତ୍ୱନା ଦେବା ଓ ଆବଶ୍ୟକ ସମୟରେ ସହାୟତା ମାଗିବା ଶିଖାଯିବ। ଟ୍ୟାପିଂ କରିବାରେ ଅସୁବିଧା ଲାଗିଲେ ଏହା କରିବା ଆବଶ୍ୟକ ନାହିଁ। ଗଭୀର ମନୋକଷ୍ଟ ଥିଲେ ପ୍ରଶିକ୍ଷିତ କାଉନସେଲରଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।' },
    { title: 'Trauma Release', slug: 'trauma-release', icon: '🕊️', odiaTitle: 'ଆଘାତ ପରବର୍ତ୍ତୀ ସହାୟତା ଓ ସୁରକ୍ଷିତ ଯତ୍ନ', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ମାନସିକ ଆଘାତ ବା ଟ୍ରମା ଅନୁଭବ ପ୍ରତ୍ୟେକ ଲୋକଙ୍କ ଉପରେ ଭିନ୍ନ ପ୍ରଭାବ ପକାଇପାରେ। ଏହାର ସ୍ମୃତି, ଭୟ, ଅସୁରକ୍ଷା ବା ଦୈନନ୍ଦିନ କାର୍ଯ୍ୟରେ ଅସୁବିଧା ହୋଇପାରେ। ଏହି ବିଭାଗର ଉଦ୍ଦେଶ୍ୟ କାହାକୁ ନିଜେ ନିଜର ଚିକିତ୍ସା କରିବାକୁ କହିବା ନୁହେଁ; ସୁରକ୍ଷା, ସମ୍ମାନ, ସମର୍ଥନ ଓ ଯୋଗ୍ୟ ସହାୟତାର ଗୁରୁତ୍ୱ ବୁଝାଇବା। ଜୋର କରି ଘଟଣା ମନେ ପକାଇବା, ଅନିଚ୍ଛିତ ଶାରୀରିକ ଅଭ୍ୟାସ କିମ୍ବା ଅନ୍ୟଙ୍କୁ ଅନୁଭବ କହିବାକୁ ବାଧ୍ୟ କରିବା ଉଚିତ ନୁହେଁ। ବିଶ୍ୱସ୍ତ ବ୍ୟକ୍ତି, କାଉନସେଲର କିମ୍ବା ମନୋସ୍ୱାସ୍ଥ୍ୟ ବିଶେଷଜ୍ଞଙ୍କ ସହାୟତା ନିଅନ୍ତୁ। ତତ୍କାଳ ବିପଦ ଥିଲେ ସ୍ଥାନୀୟ ଜରୁରୀ ସେବାକୁ ଯୋଗାଯୋଗ କରନ୍ତୁ।' },
    { title: 'Chants', slug: 'chants', icon: 'ॐ', odiaTitle: 'ମନ୍ତ୍ର, ଜପ ଓ ଧ୍ୱନି ପରମ୍ପରା', image: 'https://images.unsplash.com/photo-1511379938547-c1f694198d?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ମନ୍ତ୍ର ଓ ଜପ ଭାରତୀୟ ଧାର୍ମିକ, ଦାର୍ଶନିକ ଓ ସାଂସ୍କୃତିକ ପରମ୍ପରାରେ ଗଭୀର ସ୍ଥାନ ରଖିଛି। ବିଭିନ୍ନ ଭାଷା, ସମ୍ପ୍ରଦାୟ ଓ ଅଞ୍ଚଳରେ ଧ୍ୱନି, ଛନ୍ଦ, ଉଚ୍ଚାରଣ ଓ ଅର୍ଥର ଅଲଗା ଧାରା ଦେଖାଯାଏ। ଏହି ବିଭାଗରେ ମନ୍ତ୍ରର ଇତିହାସ, ଭାଷା, ସାହିତ୍ୟ, ସଙ୍ଗୀତମୟ ପାଠ ଓ ସାମାଜିକ ପରିପ୍ରେକ୍ଷ୍ୟ ଅଧ୍ୟୟନ କରାଯିବ। ଜପ କରିବା ବ୍ୟକ୍ତିଗତ ଆସ୍ଥା ଓ ପସନ୍ଦର ବିଷୟ; କାହାକୁ ନିର୍ଦ୍ଦିଷ୍ଟ ଧାର୍ମିକ ଅଭ୍ୟାସ କରିବାକୁ ବାଧ୍ୟ କରାଯିବ ନାହିଁ। ଧ୍ୱନିର ଅର୍ଥ ବୁଝିବା, ଉଚ୍ଚାରଣ ଶିଖିବା ଓ ଅନ୍ୟ ପରମ୍ପରାକୁ ସମ୍ମାନ କରିବା ଏହାର ମୁଖ୍ୟ ଶିକ୍ଷା।' },
    { title: 'Hypnosis / Subconscious Training and Reprogramming', slug: 'hypnosis-subconscious-training', icon: '🌙', odiaTitle: 'ହିପ୍ନୋସିସ୍ ଓ ଅଭ୍ୟାସ ଗଠନର ମନୋବିଜ୍ଞାନ', image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ହିପ୍ନୋସିସ୍ ଏକ ବିଶେଷ ଧ୍ୟାନାବସ୍ଥା ଓ ସୁପାରିଶ ପ୍ରତି ଧ୍ୟାନ କେନ୍ଦ୍ରିତ କରିବା ସହ ଜଡ଼ିତ ବିଷୟ। “ସବ୍\u200cକନ୍\u200cସସ୍\u200c ରିପ୍ରୋଗ୍ରାମିଂ” ଶବ୍ଦଟି ଲୋକପ୍ରିୟ ଆଲୋଚନାରେ ବ୍ୟବହୃତ ହେଲେ ମଧ୍ୟ ମସ୍ତିଷ୍କକୁ କମ୍ପ୍ୟୁଟର ପରି ଏକ ମୁହୂର୍ତ୍ତରେ ପୁନଃପ୍ରୋଗ୍ରାମ କରିହେବ ବୋଲି ଧରିବା ଭୁଲ। ଅଭ୍ୟାସ ବଦଳାଇବା ପାଇଁ ସ୍ପଷ୍ଟ ଲକ୍ଷ୍ୟ, ପରିବେଶର ସଂଶୋଧନ, ପୁନରାବୃତ୍ତି, ପ୍ରତିଫଳନ ଓ ସମର୍ଥନ ଦରକାର। ହିପ୍ନୋସିସ୍ ସମ୍ପର୍କିତ ଅଭ୍ୟାସ କେବଳ ଯୋଗ୍ୟ ପ୍ରଶିକ୍ଷକଙ୍କ ନିର୍ଦ୍ଦେଶରେ ଓ ସ୍ୱଇଚ୍ଛାରେ ହେବା ଉଚିତ। ଏହାକୁ ମନୋଚିକିତ୍ସା କିମ୍ବା ଡାକ୍ତରୀ ଚିକିତ୍ସାର ବିକଳ୍ପ କରନ୍ତୁ ନାହିଁ।' },
    { title: 'Mantra Magnetism (Bio-Magnetic Field)', slug: 'mantra-magnetism', icon: '🧿', odiaTitle: 'ମନ୍ତ୍ର, ଧ୍ୟାନ ଓ ଚୁମ୍ବକତ୍ୱ ସମ୍ପର୍କିତ ଧାରଣା', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=85', odiaIntro: 'ମନ୍ତ୍ର ମ୍ୟାଗ୍ନେଟିଜମ୍ ବା ବାୟୋ-ମ୍ୟାଗ୍ନେଟିକ୍ ଫିଲ୍ଡ ଶବ୍ଦଗୁଡ଼ିକ କେତେକ ଆଧୁନିକ ସ୍ୱୟଂବିକାଶ ଆଲୋଚନାରେ ମିଳେ। ଏହି ବିଷୟକୁ ଅଧ୍ୟୟନ କରିବାବେଳେ ପରମ୍ପରାଗତ ମନ୍ତ୍ର ଅଭ୍ୟାସ, ବ୍ୟକ୍ତିଗତ ଅନୁଭବ ଓ ବୈଜ୍ଞାନିକ ଭାବେ ପରୀକ୍ଷିତ ଚୁମ୍ବକତ୍ୱ ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ ବୁଝିବା ଆବଶ୍ୟକ। ମନୁଷ୍ୟ ଶରୀରର କିଛି ଜୈବ-ବିଦ୍ୟୁତ କ୍ରିୟା ଅଛି, କିନ୍ତୁ ମନ୍ତ୍ର ଦ୍ୱାରା ଅଦୃଶ୍ୟ ଚୁମ୍ବକୀୟ କ୍ଷେତ୍ରକୁ ନିୟନ୍ତ୍ରଣ କରି ସମସ୍ତ ସମସ୍ୟା ସମାଧାନ ହୁଏ ବୋଲି ପ୍ରମାଣିତ ନୁହେଁ। ଏଠାରେ ସାଂସ୍କୃତିକ ଅର୍ଥ, ଧ୍ୱନି, ଧ୍ୟାନ, ମନୋନିବେଶ ଓ ବୈଜ୍ଞାନିକ ସାକ୍ଷ୍ୟକୁ ପୃଥକ୍ ଭାବରେ ଆଲୋଚନା କରାଯିବ।' },
];


/* Shared Odia learning guide appended to every category-specific introduction.
   Each category page therefore contains a substantial 400+ word learning guide. */
const HABITUP_ODIA_GUIDE = `
ଏହି ବିଷୟକୁ ଶିଖିବାରେ ପ୍ରଥମ ପଦକ୍ଷେପ ହେଉଛି ନିଜର ଉଦ୍ଦେଶ୍ୟ ସ୍ପଷ୍ଟ କରିବା। କେବଳ ଅନ୍ୟକୁ ଦେଖି ଅଭ୍ୟାସ ଆରମ୍ଭ କରିବା ବଦଳରେ ଏହା ନିଜ ଜୀବନରେ କେଉଁ ଭଲ ପରିବର୍ତ୍ତନ ଆଣିପାରିବ, ତାହା ଭାବନ୍ତୁ। ଛୋଟ ଏବଂ ବାସ୍ତବ ଲକ୍ଷ୍ୟ ଧରନ୍ତୁ। ପ୍ରଥମ ଦିନରୁ ବହୁତ ସମୟ ଦେବା ଦରକାର ନାହିଁ। ଅଳ୍ପ ସମୟର ନିୟମିତ ଅଭ୍ୟାସ ଦୀର୍ଘ ସମୟର ଅନିୟମିତ ଚେଷ୍ଟାଠାରୁ ଅଧିକ ସହଜରେ ଦୈନିକ ଜୀବନର ଅଂଶ ହୋଇପାରେ। ନିଜର ପଢ଼ା, ଘରୋଇ ଦାୟିତ୍ୱ, ବିଶ୍ରାମ ଓ ସାମାଜିକ ଜୀବନ ସହ ସମନ୍ୱୟ ରଖି ଏକ ସୁବିଧାଜନକ ସମୟ ବାଛନ୍ତୁ।

ଅଭ୍ୟାସକୁ ମାପିବା ପାଇଁ ଏକ ଛୋଟ ଡାଏରୀ କିମ୍ବା ଡିଜିଟାଲ୍ ନୋଟ୍ ରଖିପାରିବେ। କେବେ ଅଭ୍ୟାସ କଲେ, କେତେ ସମୟ ଦେଲେ, କେମିତି ଅନୁଭବ ହେଲା ଓ କେଉଁ ଅସୁବିଧା ହେଲା ଲେଖନ୍ତୁ। ଏହି ଟିପ୍ପଣୀ ନିଜକୁ ବୁଝିବାରେ ସହାୟକ ହେବ; ଏହା ଅନ୍ୟଙ୍କ ସହ ପ୍ରତିଯୋଗିତା କରିବା ପାଇଁ ନୁହେଁ। କୌଣସି ଦିନ ଅଭ୍ୟାସ ହୋଇନଥିଲେ ନିଜକୁ ଦୋଷ ଦିଅନ୍ତୁ ନାହିଁ। ପରବର୍ତ୍ତୀ ଦିନ ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ। ଅଭ୍ୟାସ ଗଢ଼ିବାରେ ଭୁଲ, ବିରତି ଓ ପୁନଃଆରମ୍ଭ ସ୍ୱାଭାବିକ ଅଂଶ।

ବିଶ୍ୱବିଦ୍ୟାଳୟ ଜୀବନରେ ଏହି ଶିକ୍ଷାକୁ ପଢ଼ା ଓ ସମୁଦାୟ ଜୀବନ ସହ ଯୋଡ଼ାଯାଇପାରେ। ଛାତ୍ରଛାତ୍ରୀ ଛୋଟ ଦଳରେ ଅନୁଭବ ବାଣ୍ଟିପାରନ୍ତି, ପ୍ରଶ୍ନ ପଚାରିପାରନ୍ତି ଓ ନିଜ ଅଞ୍ଚଳର ପରମ୍ପରା ବିଷୟରେ ତଥ୍ୟ ସଂଗ୍ରହ କରିପାରନ୍ତି। କୌଣସି ପ୍ରାଚୀନ ପ୍ରଥା କିମ୍ବା ଆଧୁନିକ ଧାରଣାକୁ ଅଧ୍ୟୟନ କରିବାବେଳେ ତାହାର ଇତିହାସ, ଉତ୍ସ, ଉଦ୍ଦେଶ୍ୟ ଓ ପ୍ରମାଣ ଖୋଜନ୍ତୁ। ଲୋକପ୍ରଚଳିତ କଥାକୁ ପରୀକ୍ଷିତ ବୈଜ୍ଞାନିକ ତଥ୍ୟ ବୋଲି ଧରନ୍ତୁ ନାହିଁ। ଏକାଧିକ ଭରସାଯୋଗ୍ୟ ପୁସ୍ତକ, ଶିକ୍ଷକଙ୍କ ମତ ଓ ଗବେଷଣା ପଢ଼ି ନିଜର ବୁଝାମଣା ଗଢ଼ନ୍ତୁ।

ଏହି ପ୍ଲାଟଫର୍ମରେ ସମସ୍ତଙ୍କ ଅନୁଭବକୁ ସମ୍ମାନ ଦିଆଯିବ। କାହାର ବ୍ୟକ୍ତିଗତ କଥା, ଫଟୋ କିମ୍ବା ଭିଡିଓ ତାଙ୍କର ସ୍ପଷ୍ଟ ଅନୁମତି ବିନା ସେୟାର କରନ୍ତୁ ନାହିଁ। ଅନ୍ୟଙ୍କ ଶରୀର, ଚେହେରା, ଧର୍ମ, ଭାଷା, ଆର୍ଥିକ ସ୍ଥିତି କିମ୍ବା ମନୋଭାବକୁ ନେଇ ଅପମାନଜନକ ମନ୍ତବ୍ୟ ଦିଅନ୍ତୁ ନାହିଁ। ପ୍ରତ୍ୟେକ ଲୋକଙ୍କ ଶାରୀରିକ କ୍ଷମତା, ସମୟ, ପରିବାରିକ ପରିସ୍ଥିତି ଓ ବିଶ୍ୱାସ ଭିନ୍ନ। ତେଣୁ ଏକେ ପଦ୍ଧତି ସମସ୍ତଙ୍କ ପାଇଁ ଉପଯୁକ୍ତ ହେବ ବୋଲି ଭାବିବା ଠିକ୍ ନୁହେଁ। ଭଲ ଆଲୋଚନାରେ ପ୍ରଶ୍ନ, ଭଦ୍ରତା, ସମ୍ମତି ଓ ପ୍ରମାଣର ମୂଲ୍ୟ ରହିଥାଏ।

ସୁରକ୍ଷା ସବୁବେଳେ ପ୍ରଥମ। ଶରୀରରେ ଯନ୍ତ୍ରଣା, ମୁଣ୍ଡ ଘୁରିବା, ଶ୍ୱାସକଷ୍ଟ, ଭୟ କିମ୍ବା ମାନସିକ ଅସୁବିଧା ବଢ଼ିଲେ ଅଭ୍ୟାସ ବନ୍ଦ କରନ୍ତୁ। ନିଜର ଅବସ୍ଥା ଅନୁଯାୟୀ ଡାକ୍ତର, ମନୋବିଜ୍ଞାନୀ, କାଉନସେଲର କିମ୍ବା ଯୋଗ୍ୟ ପ୍ରଶିକ୍ଷକଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ। ଏଠାରେ ଥିବା ତଥ୍ୟ ଶିକ୍ଷା ଓ ସଚେତନତା ପାଇଁ; ଏହା ଡାକ୍ତରୀ ନିର୍ଣ୍ଣୟ, ଚିକିତ୍ସା କିମ୍ବା ଔଷଧର ବିକଳ୍ପ ନୁହେଁ। ଅନ୍ୟ କାହାକୁ ଚିକିତ୍ସା ବନ୍ଦ କରିବାକୁ କିମ୍ବା ଅପ୍ରମାଣିତ ପଦ୍ଧତି ନେବାକୁ ପରାମର୍ଶ ଦିଅନ୍ତୁ ନାହିଁ।

ଶେଷରେ ମନେ ରଖନ୍ତୁ, ଭଲ ଅଭ୍ୟାସର ଅର୍ଥ ସମ୍ପୂର୍ଣ୍ଣତା ନୁହେଁ; ଏହା ହେଉଛି ନିଜ ପାଇଁ ଉପଯୁକ୍ତ ଏକ ସୁସ୍ଥ ଓ ସମ୍ମାନଜନକ ପଥ ଖୋଜିବା। ନିୟମିତ ଛୋଟ ପଦକ୍ଷେପ, ଧୈର୍ଯ୍ୟ, ଉତ୍ସୁକତା ଓ ସହଯୋଗ ଦ୍ୱାରା ଶିଖିବା ଜାରି ରଖନ୍ତୁ। ଏହି ବିଭାଗକୁ ନିଜ ଅନୁଭବ, ପ୍ରଶ୍ନ ଓ ଉପଯୋଗୀ ସମ୍ପଦ ସହ ସମୃଦ୍ଧ କରନ୍ତୁ, ଯାହାଦ୍ୱାରା HabitUp ସମସ୍ତଙ୍କ ପାଇଁ ଏକ ସୁରକ୍ଷିତ, ଉତ୍ସାହଦାୟକ ଓ ଜ୍ଞାନମୂଳକ ସମୁଦାୟ ହୋଇପାରିବ।
`;

/* =========================================================
   1. INITIALIZATION
   ========================================================= */

function initialize() {
    if (initialized) return;
    initialized = true;

    const form = $('#authForm');

    if (form?.elements.department) {
        departments.forEach(department => {
            form.elements.department.add(new Option(department, department));
        });
    }

    if (form) {
        form.addEventListener('submit', handleAuth);
    } else {
        console.error('Authentication form not found. Check id="authForm".');
    }

    $('#openLogin')?.addEventListener('click', () => openAuth('login'));
    $('#openRegister')?.addEventListener('click', () => openAuth('register'));
    $('#closeAuthBtn')?.addEventListener('click', closeAuth);

    $('#loginTab')?.addEventListener('click', () => {
        mode = 'login';
        renderMode();
    });

    $('#regTab')?.addEventListener('click', () => {
        mode = 'register';
        renderMode();
    });

    $('#accountRole')?.addEventListener('change', renderMode);

    $('#menuToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
    });

    $('#modal')?.addEventListener('click', event => {
        if (event.target === $('#modal')) closeAuth();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeAuth();
            closeLightbox();
        }

        if (event.key === 'ArrowLeft' && $('#mediaLightbox')) {
            showLightboxImage(lightboxIndex - 1);
        }

        if (event.key === 'ArrowRight' && $('#mediaLightbox')) {
            showLightboxImage(lightboxIndex + 1);
        }
    });

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('submit', handleDocumentSubmit);

    document.addEventListener('change', event => {
        if (event.target.matches('#examQ input[type="radio"]')) {
            const questionId = event.target.name.slice(1);
            chosen[questionId] = event.target.value;
        }
    });

    initializeHomepageSlides();

    $('#topSearch')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') runTopSearch();
    });

    window.addEventListener('pageshow', () => {
        if (!token || !user) showPublicPage();
    });

    window.addEventListener('popstate', () => {
        if (!token || !user) showPublicPage();
    });

    if (!token) showPublicPage();
    restoreSession();
}

/* =========================================================
   2. API HELPER
   ========================================================= */

async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(API + url, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && token) {
            clearSession();
            showPublicPage();
        }

        throw new Error(
            data.error ||
            data.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

/* =========================================================
   3. AUTHENTICATION MODAL
   ========================================================= */

function openAuth(type) {
    const modal = $('#modal');
    const form = $('#authForm');

    if (!modal || !form) {
        console.error('Authentication modal or form not found.');
        return;
    }

    mode = type === 'register' ? 'register' : 'login';

    if (form.elements.role) form.elements.role.value = 'student';
    if (form.elements.password) form.elements.password.value = '';
    if (form.elements.fullName) form.elements.fullName.value = '';
    if (form.elements.phone) form.elements.phone.value = '';
    if (form.elements.department) form.elements.department.value = '';
    if (form.elements.rollNo) form.elements.rollNo.value = '';

    modal.classList.add('open');
    renderMode();
}

function closeAuth() {
    $('#modal')?.classList.remove('open');
}

function renderMode() {
    const registration = mode === 'register';
    const form = $('#authForm');

    $('#nameWrap')?.classList.toggle('hide', !registration);
    $('#roleWrap')?.classList.toggle('hide', false);

    const rawRole = form?.elements.role?.value || 'student';
    const selectedRole = registration
        ? (['student', 'guest'].includes(rawRole) ? rawRole : 'student')
        : rawRole;

    $('#deptWrap')?.classList.toggle(
        'hide',
        !registration || selectedRole !== 'student'
    );

    $('#rollWrap')?.classList.toggle(
        'hide',
        !registration || selectedRole !== 'student'
    );

    if (form?.elements.role) {
        form.elements.role.innerHTML = registration
            ? '<option value="student">Student</option><option value="guest">Guest</option>'
            : '<option value="student">Student</option><option value="faculty">Faculty</option><option value="guest">Guest</option><option value="admin">Admin</option>';

        form.elements.role.value = selectedRole;
    }

    $('#loginTab')?.classList.toggle('active', !registration);
    $('#regTab')?.classList.toggle('active', registration);

    const password = form?.elements.password;

    if (password) {
        password.autocomplete = registration
            ? 'new-password'
            : 'current-password';
    }

    const submitButton = form?.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.textContent = registration
            ? 'Create account'
            : 'Continue ↗';
    }

    if ($('#sub')) {
        $('#sub').textContent = registration
            ? 'Create a student or guest account'
            : 'Welcome to your campus portal';
    }

    if ($('#msg')) $('#msg').textContent = '';
}

/* =========================================================
   4. AUTHENTICATION FORM
   ========================================================= */

async function handleAuth(event) {
    event.preventDefault();

    const form = event.target;

    if (!(form instanceof HTMLFormElement) || form.id !== 'authForm') {
        return;
    }

    const fields = new FormData(form);
    const message = $('#msg');
    const submitButton = form.querySelector('button[type="submit"]');

    function showMessage(text) {
        if (message) message.textContent = text;
    }

    function resetButton() {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                mode === 'register' ? 'Create account' : 'Continue ↗';
        }
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait...';
    }

    showMessage('Connecting to server...');

    try {
        let body;
        let endpoint;

        if (mode === 'register') {
            body = {
                fullName: String(fields.get('fullName') || '').trim(),
                phone: String(fields.get('phone') || '').trim(),
                password: String(fields.get('password') || ''),
                department: String(fields.get('department') || ''),
                rollNo: String(fields.get('rollNo') || '').trim().toUpperCase(),
                role: String(fields.get('role') || 'student')
            };

            endpoint = '/auth/register';

            if (
                !body.fullName ||
                !body.phone ||
                !body.password ||
                !['student', 'guest'].includes(body.role) ||
                (body.role === 'student' && (!body.department || !body.rollNo))
            ) {
                throw new Error('Please complete all registration fields.');
            }

            if (
                body.role === 'student' &&
                !/^\d{2}[A-Z]{3}\d{3}$/.test(body.rollNo)
            ) {
                throw new Error('Enter roll number in format 12ABC123.');
            }

            if (body.password.length < 10) {
                throw new Error('Password must contain at least 10 characters.');
            }
        } else {
            body = {
                phone: String(fields.get('phone') || '').trim(),
                password: String(fields.get('password') || ''),
                role: String(fields.get('role') || 'student')
            };

            endpoint = '/auth/login';

            if (
                !body.phone ||
                !body.password ||
                !['student', 'faculty', 'guest', 'admin'].includes(body.role)
            ) {
                throw new Error('Enter valid login details.');
            }
        }

        const data = await api(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!data.token || !data.user) {
            throw new Error('Invalid server response. Check your backend.');
        }

        token = data.token;
        user = data.user;

        localStorage.setItem('ruiks_token', token);

        showMessage('Login successful.');
        closeAuth();
        dashboard();
    } catch (error) {
        showMessage(error.message || 'Authentication failed.');
    } finally {
        resetButton();
    }
}

/* =========================================================
   5. SESSION RESTORATION
   ========================================================= */

async function restoreSession() {
    if (!token) return;

    try {
        const data = await api('/auth/me');

        if (!data.user) throw new Error('Session unavailable.');

        user = data.user;
        dashboard();
    } catch (error) {
        clearSession();
        showPublicPage();
        console.warn('Session restoration failed:', error.message);
    }
}

/* =========================================================
   6. LOGOUT
   ========================================================= */

function clearSession() {
    token = '';
    user = null;
    localStorage.removeItem('ruiks_token');
}

function showPublicPage() {
    document.body.classList.remove('habitup-mode');
    const dashboardShell = $('#dashboard');
    dashboardShell?.classList.add('hide');
    if (dashboardShell) dashboardShell.style.display = 'none';
    $('#messageFab')?.remove();
    document.querySelector('.habitup-bottom-nav')?.remove();
    $('#nav')?.replaceChildren();
    $('#content')?.replaceChildren();
    document.body.classList.remove('authenticated', 'nav-open');

    $('#modal')?.classList.remove('open', 'show');
    closeAuth();

    if ($('#msg')) $('#msg').textContent = '';

    window.scrollTo({ top: 0, behavior: 'auto' });
}

function logout() {
    clearSession();
    stopExamTimer();

    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    activeConversation = null;
    activePage = 'Home';
    activeHabitCategory = null;
    activeExamId = null;
    submitting = false;
    chosen = {};

    const privateContent = $('#content');
    if (privateContent) privateContent.replaceChildren();

    const unreadBadge = $('#messageBadge');

    if (unreadBadge) {
        unreadBadge.textContent = '0';
        unreadBadge.classList.add('hide');
    }

    document.querySelectorAll('.nav-message-badge').forEach(el => {
        el.textContent = '0';
        el.classList.add('hide');
    });

    mode = 'login';
    showPublicPage();

    try {
        window.history.replaceState(
            { publicPage: true },
            '',
            window.location.pathname
        );
    } catch (error) {
        console.warn('Could not reset browser history after sign out:', error.message);
    }
}

function stopExamTimer() {
    if (examTimer) {
        clearInterval(examTimer);
        examTimer = null;
    }

    document.removeEventListener('visibilitychange', examVisibilityWarning);
}

/* =========================================================
   7. DASHBOARD
   ========================================================= */

function dashboard() {
    if (!user) return;

    const dashboardShell = $('#dashboard');
    dashboardShell?.classList.remove('hide');
    if (dashboardShell) dashboardShell.style.removeProperty('display');
    document.body.classList.add('authenticated');

    const welcome = $('#welcome');
    const role = $('#role');

    if (welcome) {
        welcome.textContent = 'Welcome, ' + (user.full_name || 'Ravenshawian');
    }

    if (role) {
        role.textContent = String(user.role || 'student').toUpperCase() + ' SPACE';
    }

    const adminItems = [
        ['Home', '⌂'],
        ['Publish media', '＋'],
        ['Create exam', '▤'],
        ['Live results', '▥'],
        ['Appoint admin', '♙'],
        ['Messages', '✉'],
        ['Media Gallery', '▦'],
        ['HabitUp', '✦'],
        ['Feedback', '♡'],
        ['My profile', '♙']
    ];

    const facultyItems = [
        ['Home', '⌂'],
        ['Publish media', '＋'],
        ['Create exam', '▤'],
        ['Live results', '▥'],
        ['Notices', '▤'],
        ['Messages', '✉'],
        ['Media Gallery', '▦'],
        ['HabitUp', '✦'],
        ['My profile', '♙'],
        ['Feedback', '♡']
    ];

    const memberItems = [
        ['Home', '⌂'],
        ['Notices', '▤'],
        ['Examinations', '◷'],
        ['Messages', '✉'],
        ['Media Gallery', '▦'],
        ['HabitUp', '✦'],
        ['My profile', '♙']
    ];

    const items = user.role === 'admin'
        ? adminItems
        : user.role === 'faculty'
            ? facultyItems
            : memberItems;

    const nav = $('#nav');

    if (nav) {
        nav.innerHTML = items.map(([item, icon], index) => `
            <button type="button"
                class="dashnav ${index === 0 ? 'active' : ''}"
                data-action="page"
                data-page="${safe(item)}"
                title="${safe(item)}">
                <span class="nav-icon" aria-hidden="true">${icon}</span>
                <span>${safe(item)}</span>
                ${item === 'Messages'
                    ? '<span class="nav-message-badge hide">0</span>'
                    : ''}
            </button>
        `).join('') + `
            <button type="button"
                class="dashnav signout-nav"
                data-action="logout"
                title="Sign out">
                <span class="nav-icon" aria-hidden="true">↪</span>
                <span>Sign Out</span>
            </button>
        `;
    }

    if (!$('#messageFab')) {
        $('#dashboard')?.insertAdjacentHTML(
            'beforeend',
            `<button id="messageFab" class="message-fab" type="button"
                data-action="page" data-page="Messages"
                aria-label="Open messages">✉</button>`
        );
    }

    page('Home');
    updateMessageBadge();

    if (refreshTimer) clearInterval(refreshTimer);

    refreshTimer = setInterval(() => {
        if (!token || document.hidden) return;

        updateMessageBadge();

        if (activePage === 'Messages' && !activeConversation) {
            loadUnreadPeople();
        }

        if (
            activePage === 'Home' &&
            !(document.querySelector('#recentPosts video') &&
                !document.querySelector('#recentPosts video').paused) &&
            !document.querySelector('#recentPosts input:focus, #recentPosts textarea:focus')
        ) {
            feed('all', true);
        }

        if (activePage === 'Messages' && activeConversation) {
            refreshConversation();
        }

        if (
            activePage === 'Media Gallery' &&
            !(document.querySelector('#content video') &&
                !document.querySelector('#content video').paused)
        ) {
            loadMediaGallery(true);
        }
    }, 20000);

    $('#dashboard')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/* =========================================================
   8. DASHBOARD PAGE ROUTER
   ========================================================= */

function page(pageName, element) {
    if (!user) return;

    const wasHabitUpMode = document.body.classList.contains('habitup-mode');
    const habitUpPages = ['HabitUp', 'HabitUp categories', 'HabitUp category', 'HabitUp profile', 'Profile'];
    const stayInHabitUp = habitUpPages.includes(pageName) ||
        (wasHabitUpMode && ['Messages', 'Search', 'Search profiles', 'Publish media'].includes(pageName));
    activePage = pageName;
    document.body.classList.toggle('habitup-mode', stayInHabitUp);

    document.querySelectorAll('.dashnav').forEach(button => {
        button.classList.remove('active');
    });

    if (element) {
        element.classList.add('active');
    } else {
        document.querySelectorAll('.dashnav').forEach(button => {
            if (button.dataset.page === pageName) {
                button.classList.add('active');
            }
        });
    }

    const content = $('#content');
    if (!content) return;

    stopExamTimer();
    content.innerHTML = '';

    if (pageName === 'Home') {
        content.innerHTML = '<div id="recentPosts"></div>';
        feed('all');
    }

    else if (pageName === 'Search' || pageName === 'Search profiles') {
        content.innerHTML = `
            <div class="panel">
                <h3>Search profiles, photos, videos and posts</h3>
                <input class="input" id="query"
                    placeholder="Search a name, roll number, photo, video or post"
                    maxlength="80">
                <button type="button" class="action" data-action="globalSearch">
                    Search
                </button>
                <div id="results"></div>
            </div>
        `;
        if (stayInHabitUp) renderHabitUpBottomNav('search');
    }

    else if (
        pageName === 'Publish media' &&
        ['admin', 'faculty'].includes(user.role)
    ) {
        content.innerHTML = `
            <div class="panel">
                <h3>Publish to student portal</h3>
                <form id="postForm">
                    <input class="input" name="title"
                        placeholder="Title" maxlength="200" required>
                    <textarea class="input" name="body"
                        placeholder="Description or notice details"
                        maxlength="5000"></textarea>
                    <select class="input" name="kind" required>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                        <option value="notice">Notice</option>
                        <option value="pdf">PDF</option>
                    </select>
                    <select class="input" name="category" required>
                        <option value="">Select HabitUp category</option>
                        ${HABITUP_CATEGORIES.map(category => `
                            <option value="${safe(category.slug)}">${safe(category.title)}</option>
                        `).join('')}
                    </select>
                    <input class="input" type="file" name="file"
                        accept="image/*,video/*,.pdf">
                    <button class="action" type="submit">Publish</button>
                </form>
                <p id="status"></p>
            </div>
        `;
    }

    else if (pageName === 'Media Gallery') {
        renderMediaGallery();
    }

    else if (pageName === 'HabitUp') {
        renderHabitUp();
    }

    else if (pageName === 'Profile') {
        renderHabitUpProfile();
    }

    else if (pageName === 'HabitUp categories') {
        renderHabitUpCategories();
    }

    else if (pageName === 'HabitUp category') {
        renderHabitUpCategory(activeHabitCategory);
    }

    else if (pageName === 'Notices') {
        feed('notice');
    }

    else if (
        pageName === 'Create exam' &&
        ['admin', 'faculty'].includes(user.role)
    ) {
        content.innerHTML = `
            <div class="panel">
                <h3>Examination builder</h3>
                <form id="examForm">
                    <input class="input" name="title"
                        placeholder="Exam title" maxlength="200" required>
                    <textarea class="input" name="instructions"
                        placeholder="Instructions" maxlength="5000"></textarea>
                    <label>Start
                        <input class="input" name="startsAt"
                            type="datetime-local" required>
                    </label>
                    <label>End
                        <input class="input" name="endsAt"
                            type="datetime-local" required>
                    </label>
                    <label>Duration in minutes</label>
                    <input class="input" name="durationMinutes"
                        type="number" min="1" max="600" required>
                    <label>Marks for correct answer</label>
                    <input class="input" name="marksCorrect"
                        type="number" step="0.25" value="1" required>
                    <label>Marks for wrong answer</label>
                    <input class="input" name="marksWrong"
                        type="number" step="0.25" value="0" required>
                    <div id="questions"></div>
                    <button type="button" class="action"
                        data-action="addQuestion">Add MCQ</button>
                    <button class="action" type="submit">Save and publish</button>
                </form>
                <p id="examStatus"></p>
            </div>
        `;

        qnum = 0;
        addQ();
    }

    else if (
        pageName === 'Examinations' ||
        pageName === 'Live results'
    ) {
        exams();
    }

    else if (pageName === 'Appoint admin' && user.role === 'admin') {
        content.innerHTML = `
            <div class="panel">
                <h3>Appoint an administrator</h3>
                <p>Search a registered profile, review the account, then grant administrator access.</p>
                <input class="input" id="query"
                    placeholder="Search name, department or roll number">
                <button class="action" data-action="globalSearch">
                    Search profiles
                </button>
                <div id="results"></div>
            </div>
        `;
    }

    else if (pageName === 'Feedback') {
        content.innerHTML = user.role === 'admin'
            ? `<div class="panel"><h3>Feedback inbox</h3><div id="feedbackInbox">Loading feedback…</div></div>`
            : `<div class="panel"><h3>Send feedback to administration</h3>
                <form id="feedbackForm">
                    <input class="input" name="subject" maxlength="180"
                        placeholder="Subject" required>
                    <textarea class="input" name="message" maxlength="4000"
                        placeholder="Write your feedback" required></textarea>
                    <label class="checkline">
                        <input type="checkbox" name="anonymous">
                        Submit anonymously
                    </label>
                    <button class="action" type="submit">Send feedback</button>
                </form>
                <p id="feedbackStatus"></p>
            </div>`;

        if (user.role === 'admin') loadFeedback();
    }

    else if (pageName === 'Messages') {
        updateMessageBadge();

        content.innerHTML = `
            <div class="panel">
                <h3>Direct messages</h3>
                <div class="unread-heading">
                    <h4>Unread messages</h4>
                    <span class="unread-hint">Select a person to open the conversation</span>
                </div>
                <div id="unreadPeople" class="unread-people">
                    <p>Loading unread messages…</p>
                </div>
                <hr>
                <div class="conversation-history-section">
                    <h4>Previous conversations</h4>
                    <p class="unread-hint">
                        Your direct-message history is retained permanently.
                    </p>
                    <div id="conversationHistory" class="unread-people">
                        <p>Loading previous conversations…</p>
                    </div>
                </div>
                <hr>
                <p>Search for a profile and choose Message to start a conversation.</p>
                <input class="input" id="query" placeholder="Find a person by name">
                <button class="action" data-action="globalSearch">Find people</button>
                <div id="results"></div>
                <div id="conversation"></div>
            </div>
        `;

        loadUnreadPeople();
        loadConversationHistory();
        if (stayInHabitUp) renderHabitUpBottomNav('messages');
    }

    else if (pageName === 'My profile') {
        content.innerHTML = `
            <div class="panel">
                <h3>My profile</h3>
                <div class="profile-identity-details">
                    <p><strong>Name:</strong> ${safe(user.full_name || 'Not provided')}</p>
                    <p><strong>Roll number:</strong> ${safe(user.roll_no || 'Not provided')}</p>
                    <p><strong>Department:</strong> ${safe(user.department || 'Not provided')}</p>
                </div>
                ${user.role === 'student' ? `<label for="profileSemester">Semester</label>
                <select class="input" id="profileSemester">
                    <option value="">Select your semester</option>
                    ${Array.from({length: 8}, (_, i) => `<option value="${i + 1}" ${Number(user.semester) === i + 1 ? 'selected' : ''}>Semester ${i + 1}</option>`).join('')}
                </select>
                <button type="button" class="action" data-action="saveSemester">Save semester</button>
                <p id="semesterStatus" role="status"></p>` : ''}
                ${user.avatar_url
                    ? `<img src="${safe(user.avatar_url)}" alt="Profile photo"
                        style="width:110px;height:110px;object-fit:cover;border-radius:50%">`
                    : ''}
                <input class="input" type="file" id="avatar" accept="image/*">
                <button type="button" class="action" data-action="avatar">
                    Upload profile photo
                </button>
                <p id="avatarStatus"></p>
                <div class="profile-feedback-card">
                    <div>
                        <b>Feedback &amp; suggestions</b>
                        <small>Share a problem, suggestion or idea with the portal administration.</small>
                    </div>
                    <button type="button" class="action"
                        data-action="page" data-page="Feedback">Send feedback</button>
                </div>
            </div>
        `;
    }
}

/* =========================================================
   9. GLOBAL CLICK HANDLER
   ========================================================= */

async function handleDocumentClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    switch (action) {
        case 'page':
            page(button.dataset.page, button);
            break;
        case 'topSearch':
            runTopSearch();
            break;
        case 'searchProfiles':
        case 'globalSearch':
            await globalSearch();
            break;
        case 'appointAdmin':
            await appointAdmin(id);
            break;
        case 'appointFaculty':
            await appointFaculty(id);
            break;
        case 'openMessage':
            await openConversation(id, button.dataset.name || 'Profile');
            break;
        case 'profileActivity':
            await showProfileActivity(id, button.dataset.name || 'Profile');
            break;
        case 'videoCategory':
            filterVideoCategory(button.dataset.category);
            break;
        case 'addQuestion':
            addQ();
            break;
        case 'like':
            await like(id);
            break;
        case 'comments':
            await comments(id);
            break;
        case 'comment':
            await comment(id);
            break;
        case 'start':
            await start(id);
            break;
        case 'submitExam':
            await submit(id);
            break;
        case 'leader':
            await leader(id);
            break;
        case 'avatar':
            await avatar();
            break;
        case 'saveSemester':
            await saveSemester();
            break;
        case 'logout':
            logout();
            break;
        case 'habitProfile':
            renderHabitUpProfile();
            break;
        case 'habitBackPortal':
            document.querySelector('.habitup-bottom-nav')?.remove();
            page('Home');
            break;
        case 'habitCategory':
            activeHabitCategory = button.dataset.slug;
            page('HabitUp category');
            break;
        case 'habitHome':
            activeHabitCategory = null;
            page('HabitUp');
            break;
        case 'habitBrowseCategories':
            page('HabitUp categories');
            break;
        case 'habitLike':
            await habitLike(id, button);
            break;
        case 'mediaFilter':
            activeMediaFilter = button.dataset.filter || 'all';
            loadMediaGallery();
            break;
        case 'openLightbox':
            openLightbox(button.dataset.index);
            break;
        case 'closeLightbox':
            closeLightbox();
            break;
        case 'lightboxPrev':
            showLightboxImage(lightboxIndex - 1);
            break;
        case 'lightboxNext':
            showLightboxImage(lightboxIndex + 1);
            break;
    }
}

/* =========================================================
   10. GLOBAL FORM HANDLER
   ========================================================= */

async function handleDocumentSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'postForm') await publish(event);
    else if (form.id === 'examForm') await createExam(event);
    else if (form.id === 'feedbackForm') await submitFeedback(event);
    else if (form.id === 'messageForm') await sendMessage(event);
}

/* =========================================================
   11. GLOBAL SEARCH
   ========================================================= */

async function globalSearch() {
    const query = $('#query');
    const results = $('#results');

    if (!query || !results) return;

    results.textContent = 'Searching…';

    try {
        const data = await api('/search?q=' + encodeURIComponent(query.value));
        const profiles = data.profiles || [];
        const posts = data.posts || [];

        results.innerHTML = `
            <h4>Profiles</h4>
            ${profiles.map(p => `
                <article class="search-result">
                    ${p.avatar_url
                        ? `<img src="${safe(p.avatar_url)}" alt="${safe(p.full_name)}">`
                        : `<span class="avatar-placeholder">${safe((p.full_name || '?').slice(0, 1))}</span>`}
                    <div class="search-result-info">
                        <b>${safe(p.full_name)}</b>
                        <small>${safe(p.role)} · ${safe(p.department || '')} · ${safe(p.roll_no || '')}</small>
                        <button class="action" data-action="profileActivity"
                            data-id="${Number(p.id)}" data-name="${safe(p.full_name)}">
                            View activity
                        </button>
                        ${Number(p.id) !== Number(user.id)
                            ? `<button class="action" data-action="openMessage"
                                data-id="${Number(p.id)}" data-name="${safe(p.full_name)}">
                                Message
                               </button>`
                            : ''}
                        ${user.role === 'admin' && p.role !== 'admin'
                            ? `<button class="action secondary-action"
                                data-action="appointAdmin" data-id="${Number(p.id)}">Appoint admin</button>
                               <button class="action secondary-action"
                                data-action="appointFaculty" data-id="${Number(p.id)}">Make faculty</button>`
                            : ''}
                    </div>
                </article>
            `).join('') || '<p>No profiles found.</p>'}

            <h4>Photos, videos and posts</h4>
            ${posts.map(p => `
                <article class="feed">
                    <small>${safe(p.kind)} · ${safe(p.author)}</small>
                    <h3>${safe(p.title)}</h3>
                    <p>${safe(p.body || '')}</p>
                    ${p.media_url
                        ? (p.kind === 'video'
                            ? `<video controls src="${safe(p.media_url)}"></video>`
                            : `<img src="${safe(p.media_url)}" alt="${safe(p.title)}">`)
                        : ''}
                </article>
            `).join('') || '<p>No matching posts or media.</p>'}
        `;
    } catch (error) {
        results.textContent = error.message;
    }
}

async function showProfileActivity(id, name) {
    const results = $('#results');
    if (!results) return;

    results.insertAdjacentHTML(
        'beforeend',
        `<div class="panel" id="activity-${Number(id)}">
            <h4>${safe(name)} · recent activity</h4>Loading activity…
        </div>`
    );

    const box = $('#activity-' + Number(id));

    try {
        const data = await api('/profiles/' + Number(id) + '/activity');

        box.innerHTML = `
            <h4>${safe(name)} · recent activity</h4>
            ${data.profile?.avatar_url
                ? `<img class="activity-avatar" src="${safe(data.profile.avatar_url)}" alt="${safe(name)}">`
                : ''}
            <p>${safe(data.profile?.role || '')} · ${safe(data.profile?.department || '')}</p>
            ${Number(id) !== Number(user.id)
                ? `<button class="action" data-action="openMessage"
                    data-id="${Number(id)}" data-name="${safe(name)}">Message</button>`
                : ''}
            <h5>Published media</h5>
            ${(data.posts || []).map(p => `
                <article class="feed">
                    <small>${safe(p.kind)} · ${new Date(p.created_at).toLocaleString()}</small>
                    <h3>${safe(p.title)}</h3>
                    <p>${safe(p.body || '')}</p>
                    ${p.media_url
                        ? (p.kind === 'video'
                            ? `<video controls src="${safe(p.media_url)}"></video>`
                            : `<img src="${safe(p.media_url)}" alt="${safe(p.title)}">`)
                        : ''}
                </article>
            `).join('') || '<p>No public posts.</p>'}
            <h5>Recent interactions</h5>
            ${(data.activities || []).map(a => `
                <p class="activity-line">
                    <b>${safe(a.activity_type)}</b> ·
                    ${safe(a.detail)} · <em>${safe(a.post_title)}</em>
                </p>
            `).join('') || '<p>No recent interactions.</p>'}
        `;
    } catch (error) {
        box.textContent = error.message;
    }
}

async function appointFaculty(id) {
    if (!id || !confirm('Give this profile Faculty access?')) return;

    try {
        const result = await api('/admin/faculty/' + id, { method: 'POST' });
        alert(result.message);
        await globalSearch();
    } catch (error) {
        alert(error.message);
    }
}

async function appointAdmin(id) {
    if (!id || !confirm('Appoint this account as an administrator?')) return;

    try {
        const result = await api('/admin/appoint/' + id, { method: 'POST' });
        alert(result.message);
        await globalSearch();
    } catch (error) {
        alert(error.message);
    }
}

/* =========================================================
   12. DIRECT MESSAGES - PERMANENT HISTORY
   ========================================================= */

async function loadConversationHistory() {
    const host = $('#conversationHistory');
    if (!host) return;

    try {
        const rows = await api('/messages/conversations');

        host.innerHTML = rows.map(person => `
            <button type="button" class="unread-person history-person"
                data-action="openMessage"
                data-id="${Number(person.other_user_id)}"
                data-name="${safe(person.full_name)}">
                <span class="unread-avatar">
                    ${person.avatar_url
                        ? `<img src="${safe(person.avatar_url)}" alt="${safe(person.full_name)} profile picture">`
                        : safe(String(person.full_name || '?').trim().charAt(0).toUpperCase())}
                </span>
                <span class="unread-person-main">
                    <b>${safe(person.full_name)}</b>
                    <small>
                        ${safe(person.last_message || 'Photo shared')} ·
                        ${new Date(person.latest_message_at).toLocaleString()}
                    </small>
                </span>
                <span class="history-open">Open</span>
            </button>
        `).join('') || '<p class="empty-unread">No previous conversations.</p>';
    } catch (error) {
        host.innerHTML = `<p class="empty-unread">${safe(error.message || 'Could not load previous conversations.')}</p>`;
    }
}

async function openConversation(id, name) {
    activeConversation = {
        id: Number(id),
        name: String(name || 'Profile')
    };

    const area = $('#conversation');
    if (!area) return;

    area.innerHTML = `
        <div class="conversation">
            <h4>Conversation with ${safe(name)}</h4>
            <div id="messageList">Loading…</div>
            <form id="messageForm">
                <input type="hidden" name="receiverId" value="${Number(id)}">
                <input type="hidden" name="receiverName" value="${safe(name)}">
                <textarea class="input" name="message"
                    placeholder="Write a message" maxlength="3000"></textarea>
                <label class="photo-attach">
                    Attach photo
                    <input type="file" name="file" accept="image/*">
                </label>
                <button class="action" type="submit">Send</button>
            </form>
            <p id="messageStatus"></p>
        </div>
    `;

    try {
        const messages = await api('/messages?with=' + Number(id));

        await api('/messages/read/' + Number(id), { method: 'POST' });

        updateMessageBadge();

        if (activePage === 'Messages') loadUnreadPeople();

        $('#messageList').innerHTML = renderMessages(messages);
    } catch (error) {
        $('#messageList').textContent = error.message;
    }
}

function renderMessages(messages) {
    return messages.map(m => `
        <div class="message-bubble ${Number(m.sender_id) === Number(user.id) ? 'mine' : ''}">
            <div class="message-sender">
                <span class="message-avatar">
                    ${m.sender_avatar_url
                        ? `<img src="${safe(m.sender_avatar_url)}" alt="${safe(m.sender_name)} profile picture">`
                        : safe(String(m.sender_name || '?').trim().charAt(0).toUpperCase())}
                </span>
                <b>${safe(m.sender_name)}</b>
            </div>
            <p>${safe(m.message_text || '')}</p>
            ${m.photo_url
                ? `<a href="${safe(m.photo_url)}" target="_blank" rel="noopener">
                    <img src="${safe(m.photo_url)}" alt="Shared photo">
                   </a>`
                : ''}
            <small>${new Date(m.created_at).toLocaleString()}</small>
        </div>
    `).join('') || '<p>No messages yet. Start the conversation.</p>';
}

async function sendMessage(event) {
    event.preventDefault();

    const form = event.target;
    const status = $('#messageStatus');

    try {
        const data = await api('/messages', {
            method: 'POST',
            body: new FormData(form)
        });

        if (status) status.textContent = data.message;

        const id = Number(form.elements.receiverId.value);
        await openConversation(id, form.elements.receiverName.value || 'Profile');
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

async function refreshConversation() {
    if (!activeConversation || activePage !== 'Messages') return;

    const list = $('#messageList');
    if (!list) return;

    const nearBottom =
        list.scrollHeight - list.scrollTop - list.clientHeight < 100;

    try {
        const messages = await api(
            '/messages?with=' + activeConversation.id
        );

        await api(
            '/messages/read/' + activeConversation.id,
            { method: 'POST' }
        );

        updateMessageBadge();
        if (activePage === 'Messages') loadUnreadPeople();

        list.innerHTML = renderMessages(messages);

        if (nearBottom) list.scrollTop = list.scrollHeight;
    } catch (_) {
        // Keep the last visible conversation during temporary network loss.
    }
}

async function updateMessageBadge() {
    if (!user || !token) return;

    try {
        const data = await api('/messages/unread');
        const count = Number(data.count) || 0;
        const badge = $('#messageBadge');

        if (badge) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.toggle('hide', count < 1);
        }

        document.querySelectorAll('.nav-message-badge').forEach(el => {
            el.textContent = count > 99 ? '99+' : String(count);
            el.classList.toggle('hide', count < 1);
        });

        const fab = $('#messageFab');

        if (fab) {
            fab.dataset.unread = String(count);
            fab.classList.toggle('has-unread', count > 0);
            fab.setAttribute(
                'aria-label',
                count ? `Open messages, ${count} unread` : 'Open messages'
            );
        }
    } catch (error) {
        console.warn('Unread badge refresh failed:', error.message);
    }
}

async function loadUnreadPeople() {
    const host = $('#unreadPeople');
    if (!host || !token) return;

    try {
        const rows = await api('/messages/unread/senders');

        if (!rows.length) {
            host.innerHTML =
                '<p class="empty-unread">You are all caught up. No unread messages.</p>';
            return;
        }

        host.innerHTML = rows.map(person => `
            <button type="button" class="unread-person"
                data-action="openMessage"
                data-id="${Number(person.sender_id)}"
                data-name="${safe(person.sender_name)}">
                <span class="unread-avatar">
                    ${person.avatar_url
                        ? `<img src="${safe(person.avatar_url)}" alt="">`
                        : safe(String(person.sender_name || '?').trim().charAt(0).toUpperCase())}
                </span>
                <span class="unread-person-copy">
                    <b>${safe(person.sender_name)}</b>
                    <small>
                        ${Number(person.unread_count)} unread message${Number(person.unread_count) === 1 ? '' : 's'}
                    </small>
                </span>
                <span class="unread-open">Open conversation ›</span>
            </button>
        `).join('');
    } catch (error) {
        host.innerHTML =
            `<p class="empty-unread">${safe(error.message || 'Unread messages could not be loaded.')}</p>`;
    }
}

/* =========================================================
   13. SEARCH, FEEDBACK AND TOP SEARCH
   ========================================================= */

function runTopSearch() {
    const input = $('#topSearch');
    if (!input || !input.value.trim()) return;

    page('Search');

    const query = $('#query');
    if (query) query.value = input.value.trim();

    globalSearch();
}

async function submitFeedback(event) {
    event.preventDefault();

    const form = event.target;
    const status = $('#feedbackStatus');

    try {
        const data = await api('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: form.elements.subject.value,
                message: form.elements.message.value,
                anonymous: form.elements.anonymous.checked
            })
        });

        if (status) status.textContent = data.message;
        form.reset();
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

async function loadFeedback() {
    const box = $('#feedbackInbox');
    if (!box) return;

    try {
        const rows = await api('/feedback');

        box.innerHTML = rows.map(f => `
            <article class="feedback-item">
                <small>${safe(f.sender)} · ${new Date(f.created_at).toLocaleString()}</small>
                <h4>${safe(f.subject)}</h4>
                <p>${safe(f.message)}</p>
                <span>${safe(f.status)}</span>
            </article>
        `).join('') || 'No feedback received yet.';
    } catch (error) {
        box.textContent = error.message;
    }
}

/* =========================================================
   14. MEDIA GALLERY
   Unified photo + video gallery
   ========================================================= */

function renderMediaGallery() {
    const content = $('#content');
    if (!content) return;

    content.innerHTML = `
        <section class="media-gallery-page">
            <div class="panel">
                <div class="media-gallery-heading">
                    <div>
                        <h2>Media Gallery</h2>
                        <p>Explore photographs, videos and moments from Ravenshaw University.</p>
                    </div>
                </div>

                <div class="media-gallery-filters">
                    <button type="button" class="action ${activeMediaFilter === 'all' ? 'active' : ''}"
                        data-action="mediaFilter" data-filter="all">All media</button>
                    <button type="button" class="action ${activeMediaFilter === 'photo' ? 'active' : ''}"
                        data-action="mediaFilter" data-filter="photo">Photos</button>
                    <button type="button" class="action ${activeMediaFilter === 'video' ? 'active' : ''}"
                        data-action="mediaFilter" data-filter="video">Videos</button>
                </div>

                <div id="mediaGalleryItems" class="media-gallery-grid">
                    <p>Loading media…</p>
                </div>
            </div>
        </section>
    `;

    loadMediaGallery();
}

async function loadMediaGallery(silent = false) {
    const host = $('#mediaGalleryItems');
    if (!host) return;

    if (!silent) host.innerHTML = '<p>Loading media…</p>';

    try {
        const posts = await api(
            '/posts?kind=' + encodeURIComponent(activeMediaFilter)
        );

        if (!Array.isArray(posts)) {
            throw new Error('Unexpected media response.');
        }

        const mediaPosts = posts.filter(post =>
            ['photo', 'video'].includes(post.kind) && post.media_url
        );

        if (!mediaPosts.length) {
            host.innerHTML = '<p class="empty-unread">No media available in this section yet.</p>';
            return;
        }

        lightboxItems = mediaPosts
            .filter(post => post.kind === 'photo')
            .map(post => ({
                url: post.media_url,
                title: post.title || 'Ravenshaw University photograph',
                author: post.author || ''
            }));

        host.innerHTML = mediaPosts.map(post => {
            const photoIndex = post.kind === 'photo'
                ? lightboxItems.findIndex(item => item.url === post.media_url)
                : -1;

            return `
                <article class="media-gallery-card">
                    <div class="media-gallery-preview">
                        ${post.kind === 'video'
                            ? `<video controls playsinline preload="metadata"
                                src="${safe(post.media_url)}"></video>`
                            : `<button type="button" class="media-photo-open"
                                data-action="openLightbox"
                                data-index="${photoIndex}"
                                aria-label="View ${safe(post.title)}">
                                <img src="${safe(post.media_url)}"
                                    alt="${safe(post.title)}" loading="lazy">
                               </button>`}
                    </div>
                    <div class="media-gallery-card-info">
                        <span class="media-kind">${post.kind === 'video' ? '▶ VIDEO' : '▧ PHOTO'}</span>
                        <h4>${safe(post.title)}</h4>
                        <p>${safe(post.body || '')}</p>
                        <small>Published by ${safe(post.author || 'Ravenshaw University')}</small>
                    </div>
                </article>
            `;
        }).join('');
    } catch (error) {
        host.innerHTML = `<p class="empty-unread">${safe(error.message)}</p>`;
    }
}

function openLightbox(index) {
    const parsed = Number(index);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed >= lightboxItems.length) {
        return;
    }

    lightboxIndex = parsed;

    let overlay = $('#mediaLightbox');

    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="mediaLightbox" class="media-lightbox"
                role="dialog" aria-modal="true" aria-label="Photo viewer">
                <button type="button" class="lightbox-close"
                    data-action="closeLightbox" aria-label="Close">×</button>
                <button type="button" class="lightbox-prev"
                    data-action="lightboxPrev" aria-label="Previous photo">‹</button>
                <figure class="lightbox-figure">
                    <img id="lightboxImage" src="" alt="">
                    <figcaption id="lightboxCaption"></figcaption>
                </figure>
                <button type="button" class="lightbox-next"
                    data-action="lightboxNext" aria-label="Next photo">›</button>
                <div class="lightbox-counter" id="lightboxCounter"></div>
            </div>
        `);

        overlay = $('#mediaLightbox');

        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeLightbox();
        });
    }

    overlay.classList.add('open');
    document.body.classList.add('lightbox-open');
    showLightboxImage(lightboxIndex);
}

function showLightboxImage(index) {
    if (!lightboxItems.length) return;

    lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;

    const item = lightboxItems[lightboxIndex];
    const image = $('#lightboxImage');

    if (!image) return;

    image.src = item.url;
    image.alt = item.title;

    const caption = $('#lightboxCaption');
    if (caption) {
        caption.textContent = item.author
            ? `${item.title} · ${item.author}`
            : item.title;
    }

    const counter = $('#lightboxCounter');
    if (counter) {
        counter.textContent =
            `${lightboxIndex + 1} / ${lightboxItems.length}`;
    }
}

function closeLightbox() {
    $('#mediaLightbox')?.classList.remove('open');
    document.body.classList.remove('lightbox-open');
}

function filterVideoCategory(category) {
    const cards = [...document.querySelectorAll('#content .feed')];

    cards.forEach(card => {
        const text = (card.dataset.category || '') + ' ' + card.textContent;
        card.classList.toggle(
            'category-hidden',
            category !== 'All' &&
            !text.toLowerCase().includes(category.toLowerCase())
        );
    });
}

/* =========================================================
   15. HABITUP HOME AND CATEGORIES
   ========================================================= */

function renderHabitUpBottomNav(active = 'home') {
    const old = document.querySelector('.habitup-bottom-nav');
    if (old) old.remove();
    const nav = document.createElement('nav');
    nav.className = 'habitup-bottom-nav';
    nav.setAttribute('aria-label', 'HabitUp navigation');
    nav.innerHTML = `
      <button type="button" data-action="habitHome" class="${active === 'home' ? 'active' : ''}"><span>⌂</span>Home</button>
      <button type="button" data-action="habitBrowseCategories" class="${active === 'categories' ? 'active' : ''}"><span>▦</span>Category</button>
      <button type="button" data-action="habitProfile" class="${active === 'profile' ? 'active' : ''}"><span>◉</span>Profile</button>
      ${['admin', 'faculty'].includes(user?.role) ? '<button type="button" data-action="page" data-page="Publish media"><span>＋</span>Publish media</button>' : ''}
      <button type="button" data-action="logout" class="habitup-signout" title="Sign out of your account"><span>↪</span>Sign Out</button>
      `;
    document.body.appendChild(nav);
}

async function renderHabitUp() {
    const content = $('#content');
    if (!content) return;

    content.innerHTML = `
        <section class="habitup-page">
            <div class="habitup-hero habitup-home-hero panel">
                <span class="habitup-eyebrow">WELLNESS · AWARENESS · PERSONAL GROWTH</span>
                <h2>HabitUp Community</h2>
                <p>Build healthier habits, explore mindful practices and grow together as a university community.</p>
                <button class="action habitup-primary-action" type="button"
                    data-action="habitBrowseCategories">Explore learning categories <span aria-hidden="true">→</span></button>
            </div>
            <section class="habitup-visual-guide panel" aria-label="How HabitUp works">
                <div class="habitup-visual-heading">
                    <span class="habitup-odia-kicker">HOW HABITUP WORKS</span>
                    <h2>Your journey, in five simple steps</h2>
                    <p>A visual guide to learning, reflection and faculty-supported community.</p>
                </div>
                <div class="habitup-visual-steps">
                    <article><span class="habitup-step-icon">⌕</span><b>01 · Explore</b><p>Choose a learning category that interests you.</p></article>
                    <article><span class="habitup-step-icon">▤</span><b>02 · Learn</b><p>Read the guides, resources and explanations.</p></article>
                    <article><span class="habitup-step-icon">✎</span><b>03 · Reflect</b><p>Set a small goal and note your progress.</p></article>
                    <article><span class="habitup-step-icon">✉</span><b>04 · Ask faculty</b><p>Send a question to a faculty member for guidance.</p></article>
                    <article><span class="habitup-step-icon">◎</span><b>05 · Grow</b><p>Return regularly and build steady habits.</p></article>
                </div>
            </section>
            <article class="panel habitup-odia-introduction">
                <span class="habitup-odia-kicker">ଆମର ପରିଚୟ · OUR PURPOSE</span>
                <h2>HabitUp କ’ଣ? — ଅଭ୍ୟାସ, ସଚେତନତା ଓ ସାମୂହିକ ଉନ୍ନତିର ଏକ ମଞ୍ଚ</h2>
                <p>HabitUp ହେଉଛି ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଏକ ଶିକ୍ଷାମୂଳକ ଓ ସମୁଦାୟଭିତ୍ତିକ ମଞ୍ଚ। ଏଠାରେ ଦୈନିକ ଜୀବନର ଭଲ ଅଭ୍ୟାସ, ଶରୀରର ଯତ୍ନ, ମନୋନିବେଶ, ଆତ୍ମପର୍ଯ୍ୟବେକ୍ଷଣ, ସାଂସ୍କୃତିକ ପରମ୍ପରା ଓ ବ୍ୟକ୍ତିଗତ ଉନ୍ନତି ବିଷୟରେ ଜାଣିବାର ସୁଯୋଗ ମିଳେ। ଏହାର ଉଦ୍ଦେଶ୍ୟ କାହାକୁ ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ଜୀବନଶୈଳୀ ଗ୍ରହଣ କରିବାକୁ ବାଧ୍ୟ କରିବା ନୁହେଁ; ବରଂ ନିଜ ପାଇଁ ଉପଯୁକ୍ତ, ସୁରକ୍ଷିତ ଓ ବାସ୍ତବ ଅଭ୍ୟାସ ବାଛିବାରେ ସହାୟତା କରିବା।</p>
                <h3>ଅଭ୍ୟାସ କାହିଁକି ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ?</h3>
                <p>ଆମ ଦୈନିକ ଜୀବନ ଅନେକ ଛୋଟ କାର୍ଯ୍ୟର ସମନ୍ୱୟ। ସମୟରେ ଉଠିବା, ନିୟମିତ ପଢ଼ିବା, ଶରୀରକୁ ଚଳାଇବା, ପର୍ଯ୍ୟାପ୍ତ ବିଶ୍ରାମ ନେବା, ଅନ୍ୟଙ୍କ କଥା ଧ୍ୟାନରେ ଶୁଣିବା ଓ ନିଜ ଭାବନାକୁ ବୁଝିବା ପରି ଅଭ୍ୟାସ ଧୀରେ ଧୀରେ ଜୀବନର ଗୁଣତ୍ୱକୁ ପ୍ରଭାବିତ କରେ। ଏକ ଦିନରେ ବଡ଼ ପରିବର୍ତ୍ତନ ଆଶା କରିବା ବଦଳରେ ଛୋଟ ପଦକ୍ଷେପକୁ ନିୟମିତ କରିବା ଅଧିକ ବ୍ୟବହାରିକ। HabitUp ଏହି ଭାବନାକୁ ଆଗକୁ ନେଇଯାଏ।</p>
                <h3>ଛାତ୍ରଜୀବନ ସହ HabitUp ର ସମ୍ପର୍କ</h3>
                <p>ବିଶ୍ୱବିଦ୍ୟାଳୟ ଜୀବନରେ ପଢ଼ା, ପରୀକ୍ଷା, ପ୍ରକଳ୍ପ, ସାଙ୍ଗସାଥୀ, ପରିବାର ଓ ଭବିଷ୍ୟତ ଯୋଜନା ମଧ୍ୟରେ ସନ୍ତୁଳନ ରଖିବା ଆବଶ୍ୟକ। କେବେ କେବେ ଅଧିକ ସ୍କ୍ରିନ୍ ସମୟ, ଅନିୟମିତ ନିଦ୍ରା, ଚାପ ଓ ଶାରୀରିକ ଚଳନର ଅଭାବ ଅନୁଭବ ହୋଇପାରେ। ଏଠାରେ ଛାତ୍ରଛାତ୍ରୀ ନିଜ ଦିନଚର୍ଯ୍ୟାକୁ ଅବଲୋକନ କରିପାରିବେ, ଛୋଟ ଲକ୍ଷ୍ୟ ଧରିପାରିବେ ଏବଂ ସହପାଠୀଙ୍କ ସହ ଉପଯୋଗୀ ଶିକ୍ଷାମୂଳକ ସମ୍ପଦ ବାଣ୍ଟିପାରିବେ।</p>
                <h3>ପରମ୍ପରା, ଆଧୁନିକ ଜ୍ଞାନ ଓ ପ୍ରମାଣ</h3>
                <p>HabitUp ଭାରତୀୟ ଯୋଗ, ଧ୍ୟାନ, ଶ୍ୱାସ ସଚେତନତା, ମନ୍ତ୍ର ଓ ଅନ୍ୟାନ୍ୟ ପରମ୍ପରା ବିଷୟରେ ଶିଖିବାର ଅବସର ଦିଏ। ସେହି ସହିତ ଆଧୁନିକ ମନୋବିଜ୍ଞାନ, ଅଭ୍ୟାସ ଗଠନ, ଶିକ୍ଷଣ ଓ ସ୍ୱାସ୍ଥ୍ୟ ସଚେତନତାକୁ ମଧ୍ୟ ଆଲୋଚନା କରାଯାଏ। ପରମ୍ପରାଗତ ବିଶ୍ୱାସ, ବ୍ୟକ୍ତିଗତ ଅନୁଭବ ଓ ବୈଜ୍ଞାନିକ ଭାବେ ପରୀକ୍ଷିତ ତଥ୍ୟକୁ ଅଲଗା ଭାବରେ ବୁଝିବା ଆମର ଦାୟିତ୍ୱ। ପ୍ରଶ୍ନ କରିବା, ଉତ୍ସ ଯାଞ୍ଚ କରିବା ଓ ଶିକ୍ଷକଙ୍କ ପରାମର୍ଶ ନେବା ଏଠାରେ ଉତ୍ସାହିତ କରାଯାଏ।</p>
                <h3>ସୁରକ୍ଷିତ ଓ ସମ୍ମାନଜନକ ସମୁଦାୟ</h3>
                <p>ଏହି ମଞ୍ଚରେ ପ୍ରତ୍ୟେକ ବ୍ୟକ୍ତିଙ୍କ ମତ, ଭାଷା, ସଂସ୍କୃତି, ଶାରୀରିକ କ୍ଷମତା ଓ ବ୍ୟକ୍ତିଗତ ସୀମାକୁ ସମ୍ମାନ କରାଯିବା ଉଚିତ। କାହାର ଫଟୋ, ଭିଡିଓ କିମ୍ବା ବ୍ୟକ୍ତିଗତ କଥା ଅନୁମତି ବିନା ପ୍ରକାଶ କରନ୍ତୁ ନାହିଁ। କାହାକୁ ଅଭ୍ୟାସ କରିବାକୁ ବାଧ୍ୟ କରନ୍ତୁ ନାହିଁ। ଶାରୀରିକ କିମ୍ବା ମାନସିକ ଅସୁବିଧା ହେଲେ ଅଭ୍ୟାସ ବନ୍ଦ କରି ଯୋଗ୍ୟ ଡାକ୍ତର କିମ୍ବା କାଉନସେଲରଙ୍କ ସହାୟତା ନିଅନ୍ତୁ। ଏଠାରେ ଥିବା ସୂଚନା ଶିକ୍ଷା ପାଇଁ; ଏହା ଚିକିତ୍ସାର ବିକଳ୍ପ ନୁହେଁ।</p>
                <p class="habitup-odia-closing">ଛୋଟ ଭଲ ଅଭ୍ୟାସରୁ ଆରମ୍ଭ କରନ୍ତୁ, ନିଜ ଅଗ୍ରଗତିକୁ ସମ୍ମାନ କରନ୍ତୁ ଏବଂ ଅନ୍ୟଙ୍କୁ ମଧ୍ୟ ଶିଖିବାରେ ସହଯୋଗ କରନ୍ତୁ। ଏହାହିଁ HabitUp ର ମୂଳ ଭାବନା।</p>
            </article>
            <div class="habitup-home-footer-actions">
                <button class="action" type="button" data-action="habitBrowseCategories">Browse all 15 categories</button>
            </div>
        </section>
    `;
    renderHabitUpBottomNav('home');
}


function renderHabitUpProfile() {
    activePage = 'HabitUp profile';
    document.body.classList.add('habitup-mode');
    const content = $('#content');
    if (!content || !user) return;

    content.innerHTML = `
        <section class="habitup-page habitup-profile-page">
            <div class="habitup-section-heading">
                <div>
                    <span class="habitup-odia-kicker">YOUR HABITUP SPACE</span>
                    <h2>My Profile</h2>
                    <p>Your personal Ravenshaw community profile.</p>
                </div>
                <button class="action secondary-action" type="button" data-action="habitHome">← HabitUp Home</button>
            </div>
            <article class="panel habitup-profile-card">
                <div class="habitup-profile-top">
                    ${user.avatar_url
                        ? `<img class="habitup-profile-avatar" src="${safe(user.avatar_url)}" alt="Profile photo">`
                        : `<div class="habitup-profile-avatar habitup-profile-placeholder">${safe(String(user.full_name || 'R').trim().charAt(0).toUpperCase())}</div>`}
                    <div>
                        <span class="habitup-odia-kicker">${safe(String(user.role || 'student').toUpperCase())}</span>
                        <h3>${safe(user.full_name || 'Ravenshaw member')}</h3>
                        <p>${safe(user.department || 'Ravenshaw University')}</p>
                    </div>
                </div>
                <div class="habitup-profile-details">
                    <div><small>Name</small><b>${safe(user.full_name || 'Not provided')}</b></div>
                    <div><small>Roll number</small><b>${safe(user.roll_no || 'Not provided')}</b></div>
                    <div><small>Department</small><b>${safe(user.department || 'Not provided')}</b></div>
                    <div><small>Account role</small><b>${safe(user.role || 'student')}</b></div>
                </div>
                ${user.role === 'student' ? `<div class="habitup-profile-upload">
                    <label for="profileSemester">Your semester</label>
                    <select class="input" id="profileSemester">
                        <option value="">Select your semester</option>
                        ${Array.from({length: 8}, (_, i) => `<option value="${i + 1}" ${Number(user.semester) === i + 1 ? 'selected' : ''}>Semester ${i + 1}</option>`).join('')}
                    </select>
                    <button type="button" class="action" data-action="saveSemester">Save semester</button>
                    <p id="semesterStatus" role="status"></p>
                </div>` : ''}
                <div class="habitup-profile-upload">
                    <label for="avatar">Update profile photograph</label>
                    <input class="input" type="file" id="avatar" accept="image/*">
                    <button type="button" class="action" data-action="avatar">Upload profile photo</button>
                    <p id="avatarStatus" role="status"></p>
                </div>
            </article>
            <article class="panel">
                <h3>Stay connected with HabitUp</h3>
                <p>Explore learning categories and keep your personal profile up to date.</p>
                <button class="action" type="button" data-action="habitBrowseCategories">Explore categories</button>
            </article>
        </section>`;
    renderHabitUpBottomNav('profile');
}

async function saveSemester() {
    const select = $('#profileSemester');
    const status = $('#semesterStatus');
    if (!select || !select.value) {
        if (status) status.textContent = 'Please select your semester.';
        return;
    }
    try {
        const result = await api('/profile/semester', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semester: Number(select.value) })
        });
        user.semester = result.semester;
        if (status) status.textContent = 'Semester saved successfully.';
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

async function renderHabitUpCategories() {
    const content = $('#content');
    if (!content) return;
    content.innerHTML = `
        <section class="habitup-page">
            <div class="habitup-section-heading">
                <div><h3>HabitUp Learning Categories</h3><p>ଫଟୋ ଓ ବିସ୍ତୃତ ଓଡ଼ିଆ ବିବରଣୀ ପଢ଼ିବା ପାଇଁ ଯେକୌଣସି ବିଷୟ ବାଛନ୍ତୁ।</p></div>
                <button class="action secondary-action" data-action="habitHome" type="button">← HabitUp Home</button>
            </div>
            <div id="habitCategories" class="habit-category-grid"></div>
        </section>`;
    renderHabitUpBottomNav('categories');
    await loadHabitCategories();
}

async function loadHabitCategories() {
    const host = $('#habitCategories');
    if (!host) return;

    try {
        const rows = await api('/habitup/categories');

        if (!Array.isArray(rows)) {
            throw new Error('Unexpected HabitUp category response.');
        }

        const bySlug = new Map(rows.map(row => [row.slug, row]));

        host.innerHTML = HABITUP_CATEGORIES.map(category => {
            const row = bySlug.get(category.slug) || {};
            const count = Number(row.activity_count) || 0;

            return `
                <button type="button" class="habit-category-card habit-category-photo-card"
                    data-action="habitCategory" data-slug="${category.slug}">
                    <img class="habit-category-cover" src="${safe(row.cover_url || category.image)}"
                        alt="${safe(category.title)}" loading="lazy">
                    <span class="habit-category-photo-shade"></span>
                    <span class="habit-category-icon">${category.icon}</span>
                    <span class="habit-category-title">${safe(row.title || category.title)}</span>
                    <span class="habit-category-description">${safe(category.odiaTitle)}</span>
                    <span class="habit-category-count">${count} ${count === 1 ? 'activity' : 'activities'}</span>
                    <span class="habit-category-arrow">Read details →</span>
                </button>
            `;
        }).join('');
    } catch (error) {
        // Keep the complete permanent category list visible if the API is temporarily unavailable.
        console.warn('HabitUp categories could not be refreshed:', error.message);
    }
}

async function renderHabitUpCategory(slug) {
    const content = $('#content');
    if (!content) return;
    const categoryInfo = HABITUP_CATEGORIES.find(item => item.slug === slug);
    if (!categoryInfo) { page('HabitUp categories'); return; }

    const longText = `${categoryInfo.odiaIntro}\n\n${HABITUP_ODIA_GUIDE}`;
    const paragraphs = longText.split(/\n\s*\n/).filter(Boolean);
    content.innerHTML = `
        <section class="habitup-category-page">
            <button type="button" class="action secondary-action"
                data-action="habitBrowseCategories">← ସମସ୍ତ HabitUp ବିଭାଗ</button>
            <article class="habitup-category-detail panel">
                <div class="habitup-category-cover-wrap">
                    <img class="habitup-category-detail-image" src="${safe(categoryInfo.image)}"
                        alt="${safe(categoryInfo.title)}" loading="lazy">
                    <div class="habitup-category-image-overlay">
                        <span>${categoryInfo.icon}</span>
                        <div><small>HABITUP LEARNING SERIES</small><h2>${safe(categoryInfo.odiaTitle)}</h2><p>${safe(categoryInfo.title)}</p></div>
                    </div>
                </div>
                <div class="habitup-category-odia-content">
                    <span class="habitup-odia-kicker">ବିସ୍ତୃତ ଓଡ଼ିଆ ଆଲୋଚନା</span>
                    <h2>${safe(categoryInfo.odiaTitle)}</h2>
                    ${paragraphs.map((paragraph, index) => `<p>${safe(paragraph)}</p>`).join('')}
                    <div class="habitup-safety-note"><strong>ସୁରକ୍ଷା ସୂଚନା:</strong> ଏହି ବିଷୟବସ୍ତୁ ଶିକ୍ଷା ଓ ସଚେତନତା ପାଇଁ। ଏହା ଡାକ୍ତରୀ କିମ୍ବା ମନୋଚିକିତ୍ସା ପରାମର୍ଶର ବିକଳ୍ପ ନୁହେଁ।</div>
                </div>
            </article>

            <div id="habitActivities" class="habit-activity-list"><p>Loading activities…</p></div>
        </section>`;
    renderHabitUpBottomNav('categories');
    loadHabitCategoryActivities(slug);
}

async function loadHabitCategoryActivities(slug) {
    const host = $('#habitActivities');
    if (!host) return;

    try {
        const result = await api('/habitup/categories/' + encodeURIComponent(slug));
        const activities = Array.isArray(result.activities) ? result.activities : [];
        if (!activities.length) {
            host.innerHTML = '<div class="panel">No activities published in this category yet.</div>';
            return;
        }

        host.innerHTML = activities.map(activity => {
            const url = safe(activity.media_url || '');
            let media = '';
            if (url && activity.media_type === 'image') {
                media = `<img src="${url}" alt="${safe(activity.title)}" loading="lazy" style="width:100%;max-height:480px;object-fit:contain">`;
            } else if (url && activity.media_type === 'video') {
                media = `<video controls playsinline preload="metadata" src="${url}" style="width:100%;max-height:480px"></video>`;
            } else if (url && activity.media_type === 'pdf') {
                media = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">Open PDF</a></p>`;
            }
            return `<article class="feed">
                <h3>${safe(activity.title)}</h3>
                <small>Published by ${safe(activity.full_name || 'HabitUp')}</small>
                <p>${safe(activity.body || '')}</p>
                ${media}
            </article>`;
        }).join('');
    } catch (error) {
        host.innerHTML = `<div class="panel">${safe(error.message || 'Could not load this category.')}</div>`;
    }
}

/* =========================================================
   16. PROFILE SEARCH
   ========================================================= */

async function searchProfiles() {
    const results = $('#results');
    const query = $('#query');

    if (!results || !query) return;

    results.textContent = 'Searching...';

    try {
        const profiles = await api(
            '/profiles?q=' + encodeURIComponent(query.value)
        );

        if (!Array.isArray(profiles)) {
            throw new Error('Unexpected profile response.');
        }

        results.innerHTML = profiles.map(profile => `
            <div class="feed">
                <b>${safe(profile.full_name)}</b>
                <p>
                    ${safe(profile.role)}
                    · ${safe(profile.department || '')}
                    · ${safe(profile.roll_no || '')}
                </p>
                ${Number(profile.id) !== Number(user.id)
                    ? `<button class="action" data-action="openMessage"
                        data-id="${Number(profile.id)}" data-name="${safe(profile.full_name)}">Message</button>`
                    : ''}
            </div>
        `).join('') || 'No profiles found.';
        if (!$('#conversation')) results.insertAdjacentHTML('afterend', '<div id="conversation"></div>');
    } catch (error) {
        results.textContent = error.message;
    }
}

/* =========================================================
   17. ADMIN MEDIA PUBLISHING
   ========================================================= */

async function publish(event) {
    event.preventDefault();

    const form = event.target;

    if (!(form instanceof HTMLFormElement) || form.id !== 'postForm') {
        console.error('Post upload form not found.');
        return;
    }

    const status = $('#status');
    const button = form.querySelector('button[type="submit"]');

    if (!status) return;

    if (button) {
        button.disabled = true;
        button.textContent = 'Uploading...';
    }

    status.textContent = 'Uploading media...';

    try {
        const data = await api('/habitup/activities', {
            method: 'POST',
            body: new FormData(form)
        });

        status.textContent = 'Published successfully. Post ID: ' + data.id;
        form.reset();
    } catch (error) {
        status.textContent = error.message;
        console.error('Publish error:', error);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Publish';
        }
    }
}

/* =========================================================
   18. STUDENT MEDIA FEED
   ========================================================= */

async function feed(kind, silent = false) {
    const content = kind === 'all' ? $('#recentPosts') : $('#content');

    if (!content) return;

    content.classList.toggle('photo-gallery', kind === 'photo');

    if (!silent) {
        content.innerHTML = '<div class="panel">Loading posts...</div>';
    }

    try {
        const posts = await api(
            '/posts?kind=' + encodeURIComponent(kind)
        );

        if (!Array.isArray(posts)) {
            throw new Error('Unexpected posts response.');
        }

        if (!posts.length) {
            content.innerHTML = '<div class="panel">No posts available yet.</div>';
            return;
        }

        content.innerHTML = posts.map(post => {
            const id = Number(post.id);
            const mediaUrl = safe(post.media_url || '');
            let media = '';

            if (post.media_url && post.kind === 'video') {
                media = `
                    <video controls playsinline preload="metadata"
                        src="${mediaUrl}" style="width:100%;max-height:500px"></video>
                    <a class="download-link" href="${mediaUrl}"
                        download target="_blank" rel="noopener">Download video</a>
                `;
            } else if (post.media_url && post.kind === 'photo') {
                media = `
                    <img src="${mediaUrl}" alt="${safe(post.title)}"
                        loading="lazy"
                        style="width:100%;max-height:500px;object-fit:contain">
                    <a class="download-link" href="${mediaUrl}"
                        download target="_blank" rel="noopener">Download photo</a>
                `;
            } else if (
                post.media_url &&
                ['notice', 'pdf'].includes(post.kind)
            ) {
                media = `
                    <p><a href="${mediaUrl}" target="_blank"
                        rel="noopener noreferrer">Open attachment</a></p>
                `;
            }

            return `
                <article class="feed" data-category="${safe(post.category || 'Other')}">
                    <h3>${safe(post.title)}</h3>
                    <small>Published by ${safe(post.author)}</small>
                    <p>${safe(post.body || '')}</p>
                    ${media}
                    <button type="button" class="action"
                        data-action="like" data-id="${id}">
                        ♡ ${Number(post.likes) || 0} Like
                    </button>
                    <button type="button" class="action"
                        data-action="comments" data-id="${id}">
                        Comments ${Number(post.comments) || 0}
                    </button>
                    <div id="c${id}"></div>
                </article>
            `;
        }).join('');

        if (kind === 'video') {
            content.insertAdjacentHTML(
                'afterbegin',
                `<div class="video-categories">
                    <span>Explore videos</span>
                    ${[
                        ['All', '▦'], ['Yoga', '🧘'], ['Chants', 'ॐ'],
                        ['IKS Lectures', '📚'], ['Cultural Heritage', '🪔'],
                        ['Seminars', '🎙'], ['Workshops', '🛠'], ['Events', '🎉']
                    ].map(([name, icon]) => `
                        <button type="button" data-action="videoCategory"
                            data-category="${safe(name)}">${icon} ${safe(name)}</button>
                    `).join('')}
                </div>`
            );
        }
    } catch (error) {
        content.innerHTML = `<div class="panel">${safe(error.message)}</div>`;
    }
}

/* =========================================================
   19. LIKE POSTS
   ========================================================= */

async function like(id) {
    try {
        await api('/posts/' + id + '/like', { method: 'POST' });
        alert('Post liked successfully.');
    } catch (error) {
        alert(error.message);
    }
}

/* =========================================================
   20. LOAD COMMENTS
   ========================================================= */

async function comments(id) {
    const container = $('#c' + id);
    if (!container) return;

    container.textContent = 'Loading comments...';

    try {
        const data = await api('/posts/' + id + '/comments');

        if (!Array.isArray(data)) {
            throw new Error('Unexpected comments response.');
        }

        container.innerHTML = `
            <div class="comment-list">
                ${data.map(item => `
                    <p><b>${safe(item.full_name)}:</b>
                    ${safe(item.comment_text)}</p>
                `).join('')}
                ${data.length ? '' : '<p>No comments yet.</p>'}
            </div>
            <input class="input" id="comment${id}"
                maxlength="1200" placeholder="Write a comment">
            <button type="button" class="action"
                data-action="comment" data-id="${id}">Send</button>
            <p id="commentStatus${id}"></p>
        `;
    } catch (error) {
        container.textContent = error.message;
    }
}

/* =========================================================
   21. ADD COMMENT
   ========================================================= */

async function comment(id) {
    const input = $('#comment' + id);
    const status = $('#commentStatus' + id);

    if (!input || !input.value.trim()) {
        if (status) status.textContent = 'Write a comment first.';
        return;
    }

    try {
        await api('/posts/' + id + '/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: input.value.trim() })
        });

        await comments(id);
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

/* =========================================================
   22. ADD MCQ
   ========================================================= */

function addQ() {
    const questions = $('#questions');
    if (!questions) return;

    const number = ++qnum;

    questions.insertAdjacentHTML('beforeend', `
        <div class="feed" id="question${number}">
            <b>Question ${number}</b>
            <input class="input" name="q${number}question"
                placeholder="Enter question" maxlength="2000" required>
            ${['A', 'B', 'C', 'D'].map(option => `
                <input class="input" name="q${number}${option}"
                    placeholder="Option ${option}" maxlength="1000" required>
            `).join('')}
            <label>Correct answer</label>
            <select class="input" name="q${number}answer">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
            </select>
        </div>
    `);
}

/* =========================================================
   23. CREATE AND PUBLISH EXAM
   ========================================================= */

async function createExam(event) {
    event.preventDefault();

    const form = event.target;

    if (!(form instanceof HTMLFormElement) || form.id !== 'examForm') {
        console.error('Exam form not found.');
        return;
    }

    const fields = new FormData(form);
    const status = $('#examStatus');
    const button = form.querySelector('button[type="submit"]');

    if (!status) return;

    const questions = [];

    for (let number = 1; number <= qnum; number++) {
        const question = fields.get('q' + number + 'question');
        if (!question) continue;

        questions.push({
            question: String(question).trim(),
            A: String(fields.get('q' + number + 'A') || '').trim(),
            B: String(fields.get('q' + number + 'B') || '').trim(),
            C: String(fields.get('q' + number + 'C') || '').trim(),
            D: String(fields.get('q' + number + 'D') || '').trim(),
            answer: String(fields.get('q' + number + 'answer') || '')
        });
    }

    const startsAt = fields.get('startsAt');
    const endsAt = fields.get('endsAt');

    if (
        !startsAt ||
        !endsAt ||
        new Date(endsAt) <= new Date(startsAt)
    ) {
        status.textContent =
            'The exam end time must be later than the start time.';
        return;
    }

    if (!questions.length) {
        status.textContent = 'Add at least one question.';
        return;
    }

    const body = {
        title: String(fields.get('title') || '').trim(),
        instructions: String(fields.get('instructions') || '').trim(),
        startsAt,
        endsAt,
        durationMinutes: Number(fields.get('durationMinutes')),
        marksCorrect: Number(fields.get('marksCorrect')),
        marksWrong: Number(fields.get('marksWrong')),
        questions
    };

    if (
        !body.title ||
        !Number.isFinite(body.durationMinutes) ||
        body.durationMinutes < 1
    ) {
        status.textContent = 'Enter valid exam details.';
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Publishing...';
    }

    status.textContent = 'Creating examination...';

    try {
        const result = await api('/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        status.textContent =
            'Exam published successfully. Exam ID: ' + result.id;

        form.reset();
        $('#questions').innerHTML = '';
        qnum = 0;
        addQ();
    } catch (error) {
        status.textContent = error.message;
        console.error('Exam creation error:', error);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Save and publish';
        }
    }
}

/* =========================================================
   24. LOAD EXAMINATIONS / RESULTS
   ========================================================= */

async function exams() {
    const content = $('#content');
    if (!content) return;

    content.innerHTML = '<div class="panel">Loading examinations...</div>';

    try {
        const data = await api('/exams');

        if (!Array.isArray(data)) {
            throw new Error('Unexpected examination response.');
        }

        if (!data.length) {
            content.innerHTML =
                '<div class="panel">No examinations published yet.</div>';
            return;
        }

        content.innerHTML = data.map(exam => {
            const id = Number(exam.id);
            const startDate = new Date(exam.starts_at);
            const endDate = new Date(exam.ends_at);

            return `
                <div class="feed">
                    <h3>${safe(exam.title)}</h3>
                    <p>${safe(exam.instructions || '')}</p>
                    <p>Start: ${safe(
                        Number.isNaN(startDate.getTime())
                            ? exam.starts_at
                            : startDate.toLocaleString()
                    )}</p>
                    <p>End: ${safe(
                        Number.isNaN(endDate.getTime())
                            ? exam.ends_at
                            : endDate.toLocaleString()
                    )}</p>
                    <p>Duration: ${Number(exam.duration_minutes)} minutes</p>
                    <p>Status: ${safe(exam.status)}</p>
                    ${user.role === 'student'
                        ? `<button type="button" class="action"
                            data-action="start" data-id="${id}">Start exam</button>`
                        : `<button type="button" class="action"
                            data-action="leader" data-id="${id}">View results</button>`}
                    <div id="leader${id}"></div>
                </div>
            `;
        }).join('');
    } catch (error) {
        content.innerHTML = `<div class="panel">${safe(error.message)}</div>`;
    }
}

/* =========================================================
   25. EXAM LEADERBOARD
   ========================================================= */

async function leader(id) {
    const container = $('#leader' + id);
    if (!container) return;

    container.textContent = 'Loading results...';

    try {
        const data = await api('/exams/' + id + '/leaderboard');

        if (!Array.isArray(data)) {
            throw new Error('Unexpected leaderboard response.');
        }

        container.innerHTML = data.map(result => `
            <div class="feed">
                <b>#${Number(result.rank)} ${safe(result.full_name)}</b>
                <p>${safe(result.department || '')} · ${safe(result.roll_no || '')}</p>
                <p>Score: ${Number(result.score)} marks</p>
            </div>
        `).join('') || '<p>No submitted results yet.</p>';
    } catch (error) {
        container.textContent = error.message;
    }
}

/* =========================================================
   26. START EXAM
   ========================================================= */

async function start(id) {
    if (user?.role !== 'student') {
        alert('Only students can start examinations.');
        return;
    }

    stopExamTimer();

    submitting = false;
    chosen = {};
    activeExamId = Number(id);

    try {
        const data = await api('/exams/' + id + '/start', {
            method: 'POST'
        });

        if (!Array.isArray(data.questions) || !data.deadline) {
            throw new Error('Invalid examination response.');
        }

        const content = $('#content');

        if (!content) {
            activeExamId = null;
            return;
        }

        content.innerHTML = `
            <div class="panel">
                <h3>Examination in progress</h3>
                <b id="timer">Preparing timer...</b>
                <p>Please complete the examination before time expires.</p>
                <div id="examQ"></div>
                <button type="button" class="action"
                    id="submitExamButton" data-action="submitExam"
                    data-id="${Number(id)}">Submit examination</button>
                <p id="examSubmitStatus"></p>
            </div>
        `;

        $('#examQ').innerHTML = data.questions.map((question, index) => `
            <div class="feed">
                <b>Q${index + 1}. ${safe(question.question)}</b>
                ${['A', 'B', 'C', 'D'].map(option => `
                    <label style="display:block;margin:8px">
                        <input type="radio"
                            name="q${Number(question.id)}"
                            value="${option}">
                        ${option}. ${safe(question[option])}
                    </label>
                `).join('')}
            </div>
        `).join('');

        const deadline = new Date(data.deadline).getTime();

        if (!Number.isFinite(deadline)) {
            throw new Error('Invalid examination deadline.');
        }

        function updateTimer() {
            const timer = $('#timer');

            if (!timer) {
                stopExamTimer();
                return;
            }

            const remaining = Math.max(
                0,
                Math.floor((deadline - Date.now()) / 1000)
            );

            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;

            timer.textContent =
                'Time remaining: ' +
                minutes + ':' +
                String(seconds).padStart(2, '0');

            if (remaining <= 0) {
                stopExamTimer();
                submit(Number(id));
            }
        }

        updateTimer();
        examTimer = setInterval(updateTimer, 1000);

        document.addEventListener(
            'visibilitychange',
            examVisibilityWarning
        );
    } catch (error) {
        activeExamId = null;
        alert(error.message);
    }
}

function examVisibilityWarning() {
    if (
        document.hidden &&
        activeExamId !== null &&
        !submitting
    ) {
        alert('Tab change detected. Please return to your examination.');
    }
}

/* =========================================================
   27. SUBMIT EXAM
   ========================================================= */

async function submit(id) {
    if (submitting) return;

    if (activeExamId !== null && Number(id) !== activeExamId) {
        return;
    }

    submitting = true;
    stopExamTimer();

    const button = $('#submitExamButton');
    const status = $('#examSubmitStatus');

    if (button) {
        button.disabled = true;
        button.textContent = 'Submitting...';
    }

    if (status) status.textContent = 'Submitting your answers...';

    try {
        const result = await api('/exams/' + id + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: chosen })
        });

        activeExamId = null;

        const content = $('#content');

        if (content) {
            content.innerHTML = `
                <div class="panel">
                    <h3>Examination submitted</h3>
                    <p>Your score: <b>${Number(result.score)} marks</b></p>
                    <p>Status: ${safe(result.status)}</p>
                </div>
            `;
        }
    } catch (error) {
        submitting = false;

        if (button) {
            button.disabled = false;
            button.textContent = 'Submit examination';
        }

        if (status) status.textContent = error.message;
        alert(error.message);
    }
}

/* =========================================================
   28. PROFILE PHOTO UPLOAD
   ========================================================= */

async function avatar() {
    const input = $('#avatar');
    const status = $('#avatarStatus');

    if (!input || !input.files.length) {
        if (status) status.textContent = 'Choose a profile photo first.';
        return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
        status.textContent = 'Please choose an image file.';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        status.textContent = 'Image must be smaller than 10 MB.';
        return;
    }

    const form = new FormData();
    form.append('file', file);

    status.textContent = 'Uploading profile photo...';

    try {
        const data = await api('/profile/avatar', {
            method: 'POST',
            body: form
        });

        user.avatar_url = data.avatarUrl;
        if (activePage === 'HabitUp profile') {
            renderHabitUpProfile();
            const refreshedStatus = $('#avatarStatus');
            if (refreshedStatus) refreshedStatus.textContent = 'Profile photo updated successfully.';
        } else {
            status.textContent = 'Profile photo updated successfully.';
            page('My profile');
        }
    } catch (error) {
        status.textContent = error.message;
    }
}

/* =========================================================
   HOMEPAGE ORIGINAL PHOTO SLIDESHOW
   ========================================================= */

function initializeHomepageSlides() {
    const img = $('#homeSlide');
    if (!img) return;

    const slides = [
        { src: '/assets/campus-main.jpg', alt: 'Ravenshaw University main red brick building', caption: 'ରେଭେନ୍ସା ବିଶ୍ୱବିଦ୍ୟାଳୟ · ମୁଖ୍ୟ ଭବନ' },
        { src: '/assets/kanika-library.jpg', alt: 'Kanika Library Ravenshaw University', caption: 'କନିକା ପାଠାଗାର · ୧୯୨୨ ଠାରୁ' },
        { src: '/assets/academic-block.jpg', alt: 'Ravenshaw University academic block', caption: 'ଶିକ୍ଷା ଭବନ · ରେଭେନ୍ସା' },
        { src: '/assets/convention-centre.jpg', alt: 'Ravenshaw Convention Centre', caption: 'ସାତ ସ୍ତମ୍ଭର ପ୍ରଜ୍ଞା · କନଭେନସନ୍ ସେଣ୍ଟର' },
        { src: '/assets/convention-centre-students.jpg', alt: 'Ravenshaw students at convention centre', caption: 'ଛାତ୍ରଜୀବନ · ଏକତା ଓ ଉତ୍ସାହ' },
        { src: '/assets/campus-courtyard.jpg', alt: 'Ravenshaw University courtyard', caption: 'ରେଭେନ୍ସା କ୍ୟାମ୍ପସ୍ · ଆକାଶ ଓ ସ୍ଥାପତ୍ୟ' },
        { src: '/assets/ravenshaw-entrance.jpg', alt: 'Ravenshaw University entrance', caption: 'ରେଭେନ୍ସାର ପ୍ରବେଶଦ୍ୱାର' },
        { src: '/assets/campus-garden-wide.jpg', alt: 'Ravenshaw garden and main building', caption: 'ଫୁଲବଗିଚା · ଶାନ୍ତ ଶିକ୍ଷା ପରିବେଶ' },
        { src: '/assets/campus-aerial.jpg', alt: 'Aerial Ravenshaw campus view', caption: 'ଆକାଶ ଦୃଷ୍ଟିରେ ରେଭେନ୍ସା' },
        { src: '/assets/i-love-ravenshaw.jpg', alt: 'I love Ravenshaw campus sign', caption: 'ଆମ ଗର୍ବ · ଆମ ରେଭେନ୍ସା' },
        { src: '/assets/flag-campus.jpg', alt: 'Indian flag at Ravenshaw campus', caption: 'ଜାତୀୟ ପତାକା · ରେଭେନ୍ସା ପରିସର' },
        { src: '/assets/main-building-garden.jpeg', alt: 'Ravenshaw main building and garden path', caption: 'ଐତିହ୍ୟର ପଥ · ଆଗାମୀ ପିଢ଼ି' }
    ];

    let current = 0;

    const show = index => {
        current = (index + slides.length) % slides.length;

        img.src = slides[current].src;
        img.alt = slides[current].alt;

        if ($('#slideCaption')) {
            $('#slideCaption').textContent = slides[current].caption;
        }

        if ($('#slideCount')) {
            $('#slideCount').textContent =
                String(current + 1).padStart(2, '0') +
                ' / ' +
                String(slides.length).padStart(2, '0');
        }
    };

    $('#slidePrev')?.addEventListener('click', () => show(current - 1));
    $('#slideNext')?.addEventListener('click', () => show(current + 1));

    window.setInterval(() => show(current + 1), 5000);
}

/* =========================================================
   SAFE HTML OUTPUT
   ========================================================= */

function safe(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]
    );
}

/* =========================================================
   START APPLICATION
   ========================================================= */

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initialize,
        { once: true }
    );
} else {
    initialize();
}
