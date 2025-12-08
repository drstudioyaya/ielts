/**
 * FREE VERSION – SECTION 1
 * 多套 5 题小题组（每套有独立音频）
 * 免费版测试会随机抽取其中一套
 */

window.FREE_SECTION1_SETS = [

  // ==========================
  // 🎧 Set 1 – Sample Dialogue
  // ==========================
  {
    id: "s1_set1",
    title: "Free Listening – Section 1 – Set 1",
    audio: "/audio/free/section1_set1.mp3",   // 上传后更新此路径

    questions: [
      {
        number: 1,
        type: "blank",
        question: "Child’s name:",
        answer: "Ethan"
      },
      {
        number: 2,
        type: "blank",
        question: "Age:",
        answer: "9"
      },
      {
        number: 3,
        type: "blank",
        question: "Allergy:",
        answer: "peanut"
      },
      {
        number: 4,
        type: "mcq",
        question: "Which programme did Ethan join?",
        options: ["Adventure Camp", "Explorer Camp", "Art Camp"],
        answer: "Explorer Camp"
      },
      {
        number: 5,
        type: "mcq",
        question: "How long is the programme?",
        options: ["One week", "Two weeks", "Three weeks"],
        answer: "Two weeks"
      }
    ]
  },


  // ==========================
  // 🎧 Set 2 – Another Dialogue
  // ==========================
  {
    id: "s1_set2",
    title: "Free Listening – Section 1 – Set 2",
    audio: "/audio/free/section1_set2.mp3",   // 上传后更新此路径

    questions: [
      {
        number: 1,
        type: "blank",
        question: "Customer’s name:",
        answer: "Lily Chen"
      },
      {
        number: 2,
        type: "blank",
        question: "Preferred start date:",
        answer: "June 5th"
      },
      {
        number: 3,
        type: "blank",
        question: "Contact number:",
        answer: "549233018"
      },
      {
        number: 4,
        type: "mcq",
        question: "What activity did Lily choose?",
        options: ["Swimming", "Painting", "Dance"],
        answer: "Painting"
      },
      {
        number: 5,
        type: "mcq",
        question: "How will she make the payment?",
        options: ["Credit card", "Bank transfer", "Cash"],
        answer: "Credit card"
      }
    ]
  }

  // 👉 未来你可以继续添加：
  // {
  //   id: "s1_set3",
  //   title: "...",
  //   audio: "/audio/free/section1_set3.mp3",
  //   questions: [ ...5题... ]
  // }
  // 无限扩展
];
