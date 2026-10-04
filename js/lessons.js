window.KipLessons = {
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

window.KipLessonReviews = {
  "needs-wants": [
    [
      { type: "teach", title: "Grove review: priorities", body: "A need protects health, safety, learning, or a responsibility. A want can still matter, but it can wait when money is limited." },
      { type: "choice", title: "Rainy-day choice", prompt: "You have $18. A raincoat costs $16 and a collectible costs $12. You need the coat for tomorrow. What comes first?", options: [{ id: "a", label: "The collectible", correct: false }, { id: "b", label: "The raincoat", correct: true }, { id: "c", label: "Buy neither and lose the money", correct: false }], explain: "The raincoat protects your health, so it is the priority." },
      { type: "choice", title: "Flexible wants", prompt: "After needs are covered, which is a healthy way to buy a want?", options: [{ id: "a", label: "Compare prices and wait for the amount you planned", correct: true }, { id: "b", label: "Spend bill money", correct: false }, { id: "c", label: "Hide the purchase from your plan", correct: false }], explain: "Planned wants fit after needs without breaking the budget." },
      { type: "reflect", title: "Priority complete", body: "Needs first does not mean wants never—it means wants get a safe place in the plan." }
    ],
    [
      { type: "teach", title: "Grove review: situations matter", body: "The same item can be a need or a want depending on the situation. Shoes are a need when yours no longer fit; a fifth decorative pair is usually a want." },
      { type: "choice", title: "School morning", prompt: "Your bus card is empty and a smoothie shop has a sale. You only have enough for one. Choose wisely.", options: [{ id: "a", label: "Refill the bus card", correct: true }, { id: "b", label: "Buy the smoothie", correct: false }, { id: "c", label: "Spend it on an app", correct: false }], explain: "Transportation to school is the immediate need." },
      { type: "choice", title: "Pause test", prompt: "What question best separates a want from an urgent need?", options: [{ id: "a", label: "Will this keep me safe, healthy, learning, or meeting a responsibility?", correct: true }, { id: "b", label: "Is it shiny?", correct: false }, { id: "c", label: "Do my friends own it?", correct: false }], explain: "Purpose and urgency—not popularity—set the priority." },
      { type: "reflect", title: "Grove review complete", body: "Context changes categories. Ask what the purchase does and what happens if you wait." }
    ]
  ],
  "budget-basics": [
    [
      { type: "teach", title: "Brook review: balance", body: "A balanced budget never assigns more money than comes in. Savings and upcoming expenses are jobs, not leftovers." },
      { type: "choice", title: "Plan $30", prompt: "Which $30 plan is balanced?", options: [{ id: "a", label: "$10 needs, $8 savings, $7 fun, $5 upcoming", correct: true }, { id: "b", label: "$20 fun, $15 needs", correct: false }, { id: "c", label: "$30 fun plus $5 savings", correct: false }], explain: "The first plan totals exactly $30 and gives money several jobs." },
      { type: "choice", title: "Budget update", prompt: "Your income is $5 less than expected. What should you do?", options: [{ id: "a", label: "Update the plan and trim a flexible category", correct: true }, { id: "b", label: "Pretend the $5 arrived", correct: false }, { id: "c", label: "Spend faster", correct: false }], explain: "A useful budget changes when real numbers change." },
      { type: "reflect", title: "Brook review complete", body: "Income is the riverbank: every planned job must fit inside it." }
    ],
    [
      { type: "teach", title: "Brook review: track reality", body: "A budget is a prediction; tracking shows what actually happened. Compare the two and adjust the next plan." },
      { type: "choice", title: "Snack category", prompt: "You planned $6 for snacks but spent $9. What is the useful next step?", options: [{ id: "a", label: "Record $9 and decide where the extra $3 comes from", correct: true }, { id: "b", label: "Record only $6", correct: false }, { id: "c", label: "Delete the budget", correct: false }], explain: "Accurate tracking lets you make an honest adjustment." },
      { type: "choice", title: "Leftover money", prompt: "You finish the week with $4 unassigned. What can you do?", options: [{ id: "a", label: "Give it a job such as savings or next week's charge", correct: true }, { id: "b", label: "Assume it vanished", correct: false }, { id: "c", label: "Count it twice", correct: false }], explain: "Leftover money can strengthen a goal or future plan." },
      { type: "reflect", title: "Brook tracking complete", body: "Plan, track, compare, adjust: that cycle makes budgets useful." }
    ]
  ],
  "saving-goals": [
    [
      { type: "teach", title: "Hill review: make it measurable", body: "A strong goal has a clear price and deadline. Divide the amount still needed by the number of saving periods." },
      { type: "choice", title: "Weekly climb", prompt: "You need $24 in 6 weeks. How much per week reaches the goal?", options: [{ id: "a", label: "$4", correct: true }, { id: "b", label: "$2", correct: false }, { id: "c", label: "$10 once", correct: false }], explain: "$24 ÷ 6 weeks = $4 per week." },
      { type: "choice", title: "Small setback", prompt: "You miss one deposit. What is the best response?", options: [{ id: "a", label: "Recalculate the remaining deposits and continue", correct: true }, { id: "b", label: "Give up forever", correct: false }, { id: "c", label: "Ignore the deadline", correct: false }], explain: "Adjusting the plan keeps a realistic goal alive." },
      { type: "reflect", title: "Hill review complete", body: "Clear amount + clear date + repeatable deposit = a climbable goal." }
    ],
    [
      { type: "teach", title: "Hill review: protect the goal", body: "Keep goal money separate from everyday spending so it is harder to use by accident." },
      { type: "choice", title: "Goal jar", prompt: "Your goal jar has $35 of $50. You receive $10. Which move keeps progress steady?", options: [{ id: "a", label: "Add a planned part of the $10 and track the new total", correct: true }, { id: "b", label: "Spend the whole jar", correct: false }, { id: "c", label: "Stop counting", correct: false }], explain: "A planned deposit protects momentum while leaving room for other needs." },
      { type: "choice", title: "Compare options", prompt: "The item drops from $50 to $42 before you buy it. What happens to your goal?", options: [{ id: "a", label: "Update the target to $42 and keep any extra for another job", correct: true }, { id: "b", label: "Throw away the extra", correct: false }, { id: "c", label: "Pay $50 anyway", correct: false }], explain: "Goals should use the best current information." },
      { type: "reflect", title: "Hill protection complete", body: "Separate, track, and update goal money as prices and timing change." }
    ]
  ],
  "upcoming-bills": [
    [
      { type: "teach", title: "Bridge review: due dates", body: "Work backward from a due date. Divide the charge by the pay periods left, then reserve that amount each period." },
      { type: "choice", title: "Two-week charge", prompt: "A $16 fee is due in two weeks. What weekly set-aside covers it?", options: [{ id: "a", label: "$8 each week", correct: true }, { id: "b", label: "$4 each week", correct: false }, { id: "c", label: "$20 each week", correct: false }], explain: "$16 divided across two weeks is $8 per week." },
      { type: "choice", title: "Recurring clue", prompt: "A charge happens every month. What makes it easier to handle?", options: [{ id: "a", label: "Pin it as recurring and include it in each monthly plan", correct: true }, { id: "b", label: "Treat it as a surprise", correct: false }, { id: "c", label: "Forget the due date", correct: false }], explain: "Recurring charges belong in every matching budget." },
      { type: "reflect", title: "Bridge review complete", body: "Due date, amount, and repeat schedule tell you how much to reserve." }
    ],
    [
      { type: "teach", title: "Bridge review: keep a buffer", body: "A small buffer is money left unassigned for minor surprises. It protects bills and goals from being raided." },
      { type: "choice", title: "Covered first", prompt: "You have $25. A $20 fee is due tomorrow. What is safely available before considering other needs?", options: [{ id: "a", label: "$5", correct: true }, { id: "b", label: "$25", correct: false }, { id: "c", label: "$20", correct: false }], explain: "Reserve the full $20 fee; only $5 remains available." },
      { type: "choice", title: "Calendar check", prompt: "When should you review upcoming charges?", options: [{ id: "a", label: "Regularly and before optional spending", correct: true }, { id: "b", label: "Only after they are late", correct: false }, { id: "c", label: "Never", correct: false }], explain: "A quick regular check prevents known expenses from becoming surprises." },
      { type: "reflect", title: "Bridge buffer complete", body: "Reserve bills first, then protect the remaining plan with a small buffer." }
    ]
  ],
  "smart-choices": [
    [
      { type: "teach", title: "Clearing review: compare value", body: "Price is what you pay; value is what the purchase does for you over time. Compare quality, use, and alternatives." },
      { type: "choice", title: "Unit-price choice", prompt: "One notebook is $3. A pack of three you will use is $6. Which has the lower cost per notebook?", options: [{ id: "a", label: "The $6 pack at $2 each", correct: true }, { id: "b", label: "The $3 notebook", correct: false }, { id: "c", label: "They are the same", correct: false }], explain: "$6 ÷ 3 = $2 each, lower than $3 each." },
      { type: "choice", title: "Impulse pause", prompt: "An online countdown says a want disappears in ten minutes. Best first move?", options: [{ id: "a", label: "Pause and check the budget instead of obeying the timer", correct: true }, { id: "b", label: "Buy immediately", correct: false }, { id: "c", label: "Use charge money", correct: false }], explain: "Artificial urgency should not replace your plan." },
      { type: "reflect", title: "Clearing review complete", body: "Compare cost, usefulness, alternatives, and your current plan before paying." }
    ],
    [
      { type: "teach", title: "Clearing review: opportunity cost", body: "Choosing one thing means giving up another use for that money. The next-best thing you give up is the opportunity cost." },
      { type: "choice", title: "One choice", prompt: "You spend $12 of goal money on a game. What is the opportunity cost?", options: [{ id: "a", label: "The goal progress and other purchase that $12 could have supported", correct: true }, { id: "b", label: "Nothing", correct: false }, { id: "c", label: "The game's box", correct: false }], explain: "The same $12 cannot support both choices at once." },
      { type: "choice", title: "Best comparison", prompt: "Before choosing between two wants, what should you compare?", options: [{ id: "a", label: "Total cost, how often you will use each, and what goal gets delayed", correct: true }, { id: "b", label: "Only the brighter color", correct: false }, { id: "c", label: "Only what a friend picked", correct: false }], explain: "Good comparisons include both money and usefulness." },
      { type: "reflect", title: "Clearing opportunity complete", body: "Every dollar can do one job at a time. Choose the job with the strongest value." }
    ]
  ]
};
