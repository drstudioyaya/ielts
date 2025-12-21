/**
 * PREMIUM – IELTS Listening Test 1
 * Unified Question Bank + Answer Checking Logic
 * （支持多答案、同义词、格式容错）
 */

window.PREMIUM_TEST1 = {
  /* =========================
     SECTION 1
  ========================== */
  section1: {
    audio: "/public/audio/premium/test1/Listening_Test_1_SECTION_1.mp3",

    questions: [
      { number: 1, type: "blank", question: "Child’s Name:" },
      { number: 2, type: "blank", question: "Age:" },
      { number: 3, type: "blank", question: "Programme Start Date:" },
      { number: 4, type: "blank", question: "Basic Fee:" },
      { number: 5, type: "blank", question: "Meal Plan Fee:" },
      { number: 6, type: "blank", question: "Allergy Information:" },

      {
        number: 7,
        type: "mcq",
        question: "Which programme is suitable for Ethan?",
        options: ["Adventure Camp", "Explorer Camp", "Science Camp"]
      },
      {
        number: 8,
        type: "mcq",
        question: "How long does the programme last?",
        options: ["One week", "Two weeks", "Three weeks"]
      },
      {
        number: 9,
        type: "mcq",
        question: "How will the woman pay?",
        options: ["By credit card", "By bank transfer", "In cash"]
      },
      {
        number: 10,
        type: "mcq",
        question: "What will the woman receive after completing the online form?",
        options: [
          "A confirmation letter",
          "A payment receipt",
          "An email containing bank details"
        ]
      }
    ],

    answers: {
      1: ["ethan park"],
      2: ["9"],
      3: ["july 14th", "14 july"],
      4: ["480", "$480"],
      5: ["60", "$60"],
      6: ["peanut"],
      7: ["explorer camp"],
      8: ["two weeks"],
      9: ["by bank transfer"],
      10: ["an email containing bank details"]
    }
  },

  /* =========================
     SECTION 2
  ========================== */
  section2: {
    audio: "/public/audio/premium/test1/Premium_IELTS_Listening_Test1_Section2.mp3",

    questions: [
      { number: 11, type: "blank", question: "Library →" },
      { number: 12, type: "blank", question: "Main Cafeteria →" },
      { number: 13, type: "blank", question: "Sports Centre →" },
      { number: 14, type: "blank", question: "Main Lawn →" },

      { number: 15, type: "blank", question: "The library opens at ________." },
      { number: 16, type: "blank", question: "Students must show their ________ to enter the library." },

      {
        number: 17,
        type: "mcq",
        question: "What support service does the speaker mention first?",
        options: ["Accommodation help", "Language support", "IT assistance"]
      },
      {
        number: 18,
        type: "mcq",
        question: "What does the speaker advise students to do during breaks?",
        options: ["Meet in the cafeteria", "Relax on the lawn", "Visit the student centre"]
      },
      {
        number: 19,
        type: "mcq",
        question: "What should students do if they have questions after the tour?",
        options: ["Email the guide", "Go to the info desk", "Ask another student volunteer"]
      },
      {
        number: 20,
        type: "mcq",
        question: "What does the speaker suggest students check online?",
        options: ["The campus map", "Upcoming events", "Course registration dates"]
      }
    ],

    answers: {
      11: ["e"],
      12: ["c"],
      13: ["b"],
      14: ["f"],
      15: ["8:30", "8.30", "eight-thirty"],
      16: ["id", "identification"],
      17: ["b"],
      18: ["b"],
      19: ["b"],
      20: ["b"]
    }
  },

/* =========================
     SECTION 3 (LOCKED)
  ========================== */
  section3: {
    audio: "/public/audio/premium/test1/Premium_IELTS_Listening_Test1_Section3.mp3",

    questions: [
      {
        number: 21,
        type: "mcq",
        question: "What problem does the tutor identify with the students’ initial topic?",
        options: [
          "It is too broad",
          "It lacks sufficient data",
          "It overlaps with another group’s project"
        ]
      },
      {
        number: 22,
        type: "mcq",
        question: "What does Mia think will be the most challenging part of the project?",
        options: [
          "Organising group meetings",
          "Collecting survey responses",
          "Analysing academic sources"
        ]
      },
      {
        number: 23,
        type: "mcq",
        question: "Why does Leo suggest changing the research method?",
        options: [
          "The current method is too time-consuming",
          "The tutor recommends a different approach",
          "Previous studies used a similar method"
        ]
      },

      { number: 24, type: "blank", question: "Mia →" },
      { number: 25, type: "blank", question: "Leo →" },
      { number: 26, type: "blank", question: "Sarah →" },

      { number: 27, type: "blank", question: "The final report should be no more than ________ words." },
      { number: 28, type: "blank", question: "Students must submit a draft by ________." },
      { number: 29, type: "blank", question: "At least ________ academic sources are required." },
      { number: 30, type: "blank", question: "The presentation will last approximately ________ minutes." }
    ],

    answers: {
      21: ["a"],
      22: ["c"],
      23: ["a"],
      24: ["c"],
      25: ["b"],
      26: ["d"],
      27: ["3000"],
      28: ["friday"],
      29: ["five", "5"],
      30: ["ten", "10"]
    }
  },

  
 /* =========================
   SECTION 4
========================== */
section4: {
  audio: "/public/audio/premium/test1/Premium_IELTS_Listening_Test1_Section4.mp3",

  questions: [
    { number: 31, type: "blank", question: "One major goal of sustainable cities is to reduce ________ emissions." },
    { number: 32, type: "blank", question: "Public transport systems are designed to be more ________ and affordable." },
    { number: 33, type: "blank", question: "Many cities encourage the use of renewable energy, such as solar and ________ power." },
    { number: 34, type: "blank", question: "Urban planners aim to increase access to green spaces, including parks and ________." },
    { number: 35, type: "blank", question: "High-density housing helps to limit urban ________." },

    { number: 36, type: "blank", question: "Modern buildings often include systems to reduce water ________." },
    { number: 37, type: "blank", question: "Waste management focuses on recycling and ________." },
    { number: 38, type: "blank", question: "Sustainable cities prioritise pedestrian and ________ friendly streets." },
    { number: 39, type: "blank", question: "Smart technology is used to monitor energy use and traffic ________." },
    { number: 40, type: "blank", question: "Long-term planning requires cooperation between governments and local ________." }
  ],

  answers: {
    31: ["carbon"],
    32: ["efficient"],
    33: ["wind"],
    34: ["gardens"],
    35: ["sprawl"],

    36: ["consumption"],
    37: ["composting"],
    38: ["cycling"],
    39: ["flow"],
    40: ["communities"]
  }
},



/* =========================
   SHARED SCORING UTILITIES
   （所有 section 共用）
========================== */

/**
 * Normalize user input for IELTS-style marking
 */
window.normalizeAnswer = function (text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[$£,]/g, "");
};

/**
 * Check if user's answer matches ANY accepted answer
 */
window.isCorrectAnswer = function (userInput, acceptedAnswers) {
  const user = normalizeAnswer(userInput);
  return acceptedAnswers.some(
    ans => normalizeAnswer(ans) === user
  );
};
