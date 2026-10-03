const KipLessons = {
  "needs-wants": {
    title: "Needs and Wants Grove",
    unlockNote: "The grove path opened, and Gift Nook is unlocked.",
    flowerBonus: 5,
    mapRegion: "grove",
    steps: [
      {
        type: "teach",
        title: "What is a need?",
        body: "A need keeps you safe, healthy, or able to learn. Food, a coat in winter, and school supplies are needs. A want is something nice that you can wait for, like stickers or a new game."
      },
      {
        type: "sort",
        title: "Sort the grove baskets",
        body: "Put each item into Needs or Wants.",
        items: [
          { id: "food", label: "Groceries", bin: "needs" },
          { id: "game", label: "New video game", bin: "wants" },
          { id: "coat", label: "Winter coat", bin: "needs" },
          { id: "stickers", label: "Cute stickers", bin: "wants" },
          { id: "bus", label: "Bus fare to school", bin: "needs" },
          { id: "candy", label: "Candy pack", bin: "wants" },
          { id: "soap", label: "Soap", bin: "needs" },
          { id: "poster", label: "Poster for your wall", bin: "wants" }
        ]
      },
      {
        type: "choice",
        title: "Grove choice",
        prompt: "You have $8 left this week. Lunch money for field day costs $5. A shiny pin costs $6. What should you do?",
        options: [
          { id: "a", label: "Buy the pin and skip lunch money", correct: false },
          { id: "b", label: "Set aside $5 for lunch, keep $3 for later", correct: true },
          { id: "c", label: "Spend all $8 on candy", correct: false }
        ],
        explain: "Lunch money is a need for that day. The pin can wait."
      },
      {
        type: "reflect",
        title: "Grove takeaway",
        body: "Needs come first. Wants are still okay after needs are covered. That is how the grove stays healthy."
      }
    ]
  },
  "budget-basics": {
    title: "Budget Brook",
    unlockNote: "The brook path opened, and Flower Shop trading is unlocked.",
    flowerBonus: 5,
    mapRegion: "brook",
    steps: [
      {
        type: "teach",
        title: "What is a budget?",
        body: "A budget is a plan for money in and money out. First count what you get. Then give every dollar a job: save, spend, or set aside for something coming up."
      },
      {
        type: "budget",
        title: "Build a brook plan",
        body: "You have $20 this week. Make a plan that saves at least $5 and does not spend more than you have.",
        incomeLabel: "Weekly money",
        income: 20,
        rows: [
          { id: "save", label: "Savings jar", max: 12 },
          { id: "snack", label: "Snacks", max: 8 },
          { id: "fun", label: "Fun spending", max: 8 },
          { id: "soon", label: "Upcoming charge fund", max: 8 }
        ],
        rule: function (values, income) {
          const total = values.save + values.snack + values.fun + values.soon;
          if (total > income) return { ok: false, message: "That plan spends more than $20." };
          if (values.save < 5) return { ok: false, message: "Save at least $5 at the brook." };
          if (values.soon < 2) return { ok: false, message: "Park at least $2 for something coming up." };
          return { ok: true, message: "Strong brook plan. Money has jobs." };
        }
      },
      {
        type: "choice",
        title: "Brook surprise",
        prompt: "A friend asks you to spend your fun money and your savings on a carnival ticket today. What fits a budget?",
        options: [
          { id: "a", label: "Spend both piles so you do not miss out", correct: false },
          { id: "b", label: "Use only fun money if it covers the ticket", correct: true },
          { id: "c", label: "Ignore the budget forever", correct: false }
        ],
        explain: "Fun money is for fun. Savings stays protected."
      },
      {
        type: "reflect",
        title: "Brook takeaway",
        body: "When every dollar has a job, surprises shrink. The Flower Shop trusts planners like you."
      }
    ]
  },
  "saving-goals": {
    title: "Goal Hill",
    unlockNote: "Goal Hill opened the upper path, and Flower Bank is unlocked.",
    flowerBonus: 5,
    mapRegion: "hill",
    steps: [
      {
        type: "teach",
        title: "Why goals help",
        body: "A savings goal is a target you climb toward. Small deposits add up. Waiting feels easier when you can see the hill get shorter."
      },
      {
        type: "stack",
        title: "Climb with chore coins",
        body: "Add chore money until you reach $24. A tempting trinket can slow you down.",
        goal: 24,
        start: 0,
        temptAmount: 8,
        temptLabel: "Buy a hillside trinket for $8?"
      },
      {
        type: "choice",
        title: "Halfway check",
        prompt: "You are halfway to a $40 skateboard. You get $10. Best split?",
        options: [
          { id: "a", label: "Put all $10 into the goal", correct: false },
          { id: "b", label: "Put $7 in the goal and keep $3 for small fun", correct: true },
          { id: "c", label: "Spend all $10 and restart later", correct: false }
        ],
        explain: "Steady deposits plus a little fun keeps the climb going."
      },
      {
        type: "reflect",
        title: "Hill takeaway",
        body: "Goals turn waiting into a path. The Flower Bank helps you store flowers the same way."
      }
    ]
  },
  "upcoming-bills": {
    title: "Bill Bridge",
    unlockNote: "Bill Bridge connected the far bank, and Planner Post is unlocked.",
    flowerBonus: 5,
    mapRegion: "bridge",
    steps: [
      {
        type: "teach",
        title: "Plan before the due date",
        body: "Upcoming charges are money you know is coming. Crossing Bill Bridge means looking ahead, setting money aside, and checking your pocket before the day arrives."
      },
      {
        type: "match",
        title: "Match prep moves",
        body: "Pair each charge with the smartest prep.",
        pairs: [
          {
            id: "trip",
            prompt: "Field trip in 2 weeks ($12)",
            answer: "set-aside",
            options: [
              { value: "ignore", label: "Forget until the day before" },
              { value: "set-aside", label: "Set aside $6 this week and $6 next week" },
              { value: "spend-all", label: "Spend all pocket money on snacks" }
            ]
          },
          {
            id: "club",
            prompt: "Club dues Friday ($8)",
            answer: "check-balance",
            options: [
              { value: "check-balance", label: "Check your pocket and pause extra spending" },
              { value: "borrow", label: "Hope a friend pays for you" },
              { value: "guess", label: "Guess you probably have enough" }
            ]
          },
          {
            id: "gift",
            prompt: "Birthday gift next month ($15)",
            answer: "goal",
            options: [
              { value: "last-minute", label: "Wait and grab anything expensive" },
              { value: "goal", label: "Make it a savings goal and stack weekly" },
              { value: "skip-food", label: "Skip lunch money to rush-buy it" }
            ]
          },
          {
            id: "book",
            prompt: "Book fair next week ($6)",
            answer: "envelope",
            options: [
              { value: "envelope", label: "Park $6 in an envelope labeled Book Fair" },
              { value: "maybe", label: "Maybe remember on the morning of" },
              { value: "allfun", label: "Call it fun money with no plan" }
            ]
          }
        ]
      },
      {
        type: "choice",
        title: "Bridge moment",
        prompt: "Your pocket has $10. A $9 charge is due tomorrow, and a $4 snack looks tasty today. What do you do?",
        options: [
          { id: "a", label: "Buy the snack and hope tomorrow works out", correct: false },
          { id: "b", label: "Keep $9 for the charge and use $1 if you want a small treat", correct: true },
          { id: "c", label: "Spend $10 on two snacks", correct: false }
        ],
        explain: "Cover tomorrow first, then enjoy what is left."
      },
      {
        type: "reflect",
        title: "Bridge takeaway",
        body: "Looking ahead keeps you from falling in the river of surprises. Planner Post will show your real pins."
      }
    ]
  },
  "smart-choices": {
    title: "Choice Clearing",
    unlockNote: "Choice Clearing opened the south meadow. You can pull weeds and sell them for flowers.",
    flowerBonus: 5,
    mapRegion: "clearing",
    steps: [
      {
        type: "teach",
        title: "Pause before you pay",
        body: "Smart choices compare options. Ask: Is this a need? Does it hurt a goal? Do I still cover upcoming charges? A short pause protects your plan."
      },
      {
        type: "choice",
        title: "Clearing scene 1",
        prompt: "You have $10. Your savings goal needs $4 more. A toy costs $9. What do you do?",
        options: [
          { id: "a", label: "Buy the toy and restart the goal later", correct: false },
          { id: "b", label: "Save $4 for the goal and keep $6 for later fun", correct: true },
          { id: "c", label: "Spend all $10 on candy", correct: false }
        ],
        explain: "Protecting the goal first still leaves room for fun."
      },
      {
        type: "choice",
        title: "Clearing scene 2",
        prompt: "Friends want matching light-up shoes that cost your whole allowance. Wiser move?",
        options: [
          { id: "a", label: "Say yes so nobody feels left out", correct: false },
          { id: "b", label: "Check your journal and upcoming charges first", correct: true },
          { id: "c", label: "Borrow money you cannot pay back", correct: false }
        ],
        explain: "Checking your plan helps you choose without surprises."
      },
      {
        type: "choice",
        title: "Clearing scene 3",
        prompt: "You earned $5 from chores. Which split shows balance?",
        options: [
          { id: "a", label: "Spend $5 immediately", correct: false },
          { id: "b", label: "Save $2, spend $2, keep $1 for an upcoming charge", correct: true },
          { id: "c", label: "Hide it and never use a plan", correct: false }
        ],
        explain: "Splitting across save, spend, and upcoming needs builds strong habits."
      },
      {
        type: "reflect",
        title: "Clearing takeaway",
        body: "Wise choices clear the weeds of impulse spending. Now you can tidy the meadow for flower rewards."
      }
    ]
  }
};
