const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Course,
  Section,
  Lesson,
  Material,
  Enrollment,
  Assignment,
  Submission,
  Quiz,
  Question,
  QuizAttempt,
  Notification,
  LessonProgress,
} = require('../models');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const QUESTION_OPTION_IDS = ['a', 'b', 'c', 'd'];
const now = new Date();

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randDate = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randBool = (p = 0.5) => Math.random() < p;

const generateScore = (maxScore, tier) => {
  if (tier === 'high') {
    return randInt(Math.floor(maxScore * 0.9), maxScore);
  }

  if (tier === 'mid') {
    return randInt(Math.floor(maxScore * 0.65), Math.floor(maxScore * 0.89));
  }

  if (tier === 'low') {
    return randInt(Math.floor(maxScore * 0.4), Math.floor(maxScore * 0.64));
  }

  return randInt(0, Math.floor(maxScore * 0.39));
};

const round = (value) => Number(Number(value || 0).toFixed(2));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
const daysAgo = (days) => new Date(now.getTime() - days * DAY_IN_MS);
const daysFromNow = (days) => new Date(now.getTime() + days * DAY_IN_MS);

const studentTiers = {};
const getStudentTier = (studentId) => {
  if (!studentTiers[studentId]) {
    const r = Math.random();
    if (r < 0.15) {
      studentTiers[studentId] = 'high';
    } else if (r < 0.55) {
      studentTiers[studentId] = 'mid';
    } else if (r < 0.85) {
      studentTiers[studentId] = 'low';
    } else {
      studentTiers[studentId] = 'failing';
    }
  }

  return studentTiers[studentId];
};

const sampleUnique = (items, count) => {
  const pool = [...items];
  const picked = [];
  while (pool.length > 0 && picked.length < count) {
    const index = randInt(0, pool.length - 1);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
};

const buildOptions = (options) =>
  options.map((text, index) => ({
    id: QUESTION_OPTION_IDS[index],
    text,
  }));

const submissionTexts = [
  'Please find my completed assignment attached. I focused on [topic] and found [aspect] particularly challenging but learned a lot about [concept].',
  "I've completed all required sections. For the main analysis, I used the framework discussed in Lesson [N] to approach the problem systematically.",
  'Attached is my work. I spent approximately [X] hours on this and cross-referenced with the textbook on pages dealing with [topic].',
  'My submission covers all required elements. I particularly enjoyed exploring [aspect] and connecting it to real-world applications.',
  'Here is my assignment. I collaborated with study partners to verify my understanding before writing the final submission.',
];

const highFeedback = [
  'Excellent work! Your analysis is thorough and well-supported. Particularly strong on [specific aspect]. Keep it up!',
  "Outstanding submission. You've demonstrated clear understanding of the core concepts and applied them effectively.",
  'Very good work. Strong arguments and good use of evidence. Minor suggestion: expand on [point] in future submissions.',
];

const midFeedback = [
  "Good effort overall. You've covered the main points but the analysis could go deeper. Focus on explaining your reasoning more clearly.",
  'Satisfactory work. You show understanding of the basics but need to support claims with more specific evidence.',
  'Decent submission. Missing some key elements (see notes). Please review the lesson on [topic] and consider revisions.',
];

const lowFeedback = [
  'This submission needs significant improvement. The main arguments are unclear and lack supporting evidence. Please see me for help.',
  "Unfortunately this doesn't meet the requirements. Major sections are incomplete. I recommend resubmitting after review.",
  'Below expectations. The understanding of core concepts appears incomplete. Please revisit the course materials and attend office hours.',
];

const teachersSeed = [
  ['James', 'Wilson', 'james.wilson@eduflow.com'],
  ['Emily', 'Rodriguez', 'emily.rodriguez@eduflow.com'],
  ['Michael', 'Thompson', 'michael.thompson@eduflow.com'],
  ['Priya', 'Sharma', 'priya.sharma@eduflow.com'],
  ['David', 'Kim', 'david.kim@eduflow.com'],
  ['Fatima', 'Al-Hassan', 'fatima.alhassan@eduflow.com'],
  ['Robert', 'Chen', 'robert.chen@eduflow.com'],
  ['Amelia', 'Johnson', 'amelia.johnson@eduflow.com'],
  ['Carlos', 'Martinez', 'carlos.martinez@eduflow.com'],
  ['Nina', 'Patel', 'nina.patel@eduflow.com'],
];

const studentsSeed = [
  ['Liam', 'Harris', 'liam.harris@student.edu'],
  ['Olivia', 'Jackson', 'olivia.jackson@student.edu'],
  ['Noah', 'White', 'noah.white@student.edu'],
  ['Ava', 'Martin', 'ava.martin@student.edu'],
  ['William', 'Garcia', 'william.garcia@student.edu'],
  ['Sophia', 'Martinez', 'sophia.martinez@student.edu'],
  ['James', 'Anderson', 'james.anderson@student.edu'],
  ['Isabella', 'Taylor', 'isabella.taylor@student.edu'],
  ['Oliver', 'Thomas', 'oliver.thomas@student.edu'],
  ['Mia', 'Moore', 'mia.moore@student.edu'],
  ['Benjamin', 'Jackson', 'benjamin.jackson@student.edu'],
  ['Charlotte', 'Lee', 'charlotte.lee@student.edu'],
  ['Elijah', 'Perez', 'elijah.perez@student.edu'],
  ['Amelia', 'Thompson', 'amelia.thompson@student.edu'],
  ['Lucas', 'White', 'lucas.white@student.edu'],
  ['Harper', 'Lopez', 'harper.lopez@student.edu'],
  ['Mason', 'Harris', 'mason.harris@student.edu'],
  ['Evelyn', 'Gonzalez', 'evelyn.gonzalez@student.edu'],
  ['Logan', 'Wilson', 'logan.wilson@student.edu'],
  ['Abigail', 'Nelson', 'abigail.nelson@student.edu'],
  ['Ethan', 'Carter', 'ethan.carter@student.edu'],
  ['Emily', 'Mitchell', 'emily.mitchell@student.edu'],
  ['Aiden', 'Roberts', 'aiden.roberts@student.edu'],
  ['Elizabeth', 'Turner', 'elizabeth.turner@student.edu'],
  ['Jackson', 'Phillips', 'jackson.phillips@student.edu'],
  ['Sofia', 'Campbell', 'sofia.campbell@student.edu'],
  ['Sebastian', 'Parker', 'sebastian.parker@student.edu'],
  ['Avery', 'Evans', 'avery.evans@student.edu'],
  ['Jack', 'Edwards', 'jack.edwards@student.edu'],
  ['Scarlett', 'Collins', 'scarlett.collins@student.edu'],
  ['Owen', 'Stewart', 'owen.stewart@student.edu'],
  ['Victoria', 'Sanchez', 'victoria.sanchez@student.edu'],
  ['Samuel', 'Morris', 'samuel.morris@student.edu'],
  ['Grace', 'Rogers', 'grace.rogers@student.edu'],
  ['Henry', 'Reed', 'henry.reed@student.edu'],
  ['Chloe', 'Cook', 'chloe.cook@student.edu'],
  ['Alexander', 'Morgan', 'alexander.morgan@student.edu'],
  ['Penelope', 'Bell', 'penelope.bell@student.edu'],
  ['Daniel', 'Murphy', 'daniel.murphy@student.edu'],
  ['Riley', 'Bailey', 'riley.bailey@student.edu'],
  ['Matthew', 'Rivera', 'matthew.rivera@student.edu'],
  ['Zoey', 'Cooper', 'zoey.cooper@student.edu'],
  ['Joseph', 'Richardson', 'joseph.richardson@student.edu'],
  ['Nora', 'Cox', 'nora.cox@student.edu'],
  ['David', 'Howard', 'david.howard@student.edu'],
  ['Lily', 'Ward', 'lily.ward@student.edu'],
  ['Carter', 'Torres', 'carter.torres@student.edu'],
  ['Eleanor', 'Peterson', 'eleanor.peterson@student.edu'],
  ['Wyatt', 'Gray', 'wyatt.gray@student.edu'],
  ['Hannah', 'Ramirez', 'hannah.ramirez@student.edu'],
];

const courseBlueprints = [
  {
    title: 'Algebra Fundamentals',
    category: 'Mathematics',
    teacherEmail: 'james.wilson@eduflow.com',
    description:
      'Master algebraic thinking through variables, equations, functions, graphing, and real-world problem solving.',
    keywords: ['linear equations', 'functions', 'graphing', 'slope', 'expressions'],
    sections: [
      {
        title: 'Introduction to Algebra',
        lessons: [
          {
            title: 'What is Algebra?',
            content: `Algebra is the branch of mathematics dealing with symbols and the rules for
manipulating those symbols. In elementary algebra, those symbols (today written
as Latin and Greek letters) represent quantities without fixed values, known as
variables. Algebra is the foundation of all advanced mathematics.

Key concepts you will learn:
- Variables and constants
- Algebraic expressions
- The difference between an equation and an expression
- Why algebra matters in everyday life

Think of a variable as a mystery box. It holds a number we do not know yet.
When we solve for x, we are simply opening the box to find out what is inside.`,
          },
          {
            title: 'Variables and Expressions',
            content: `A variable is a letter used to represent an unknown value. An expression is a
combination of variables, numbers, and operations, but it does not include an
equals sign.

Examples of expressions:
- 3x + 5
- 2a - b
- x^2 + 2x + 1

To evaluate an expression, substitute the variable with a given number.
If x = 4, then 3x + 5 = 17.

Practice:
Evaluate 2x^2 - 3x + 1 when x = 3.
Solution: 2(9) - 3(3) + 1 = 10.`,
          },
          {
            title: 'Writing Algebraic Expressions',
            content: `Translating words into algebraic expressions is a critical skill.

Key phrases:
- sum of x and 5 -> x + 5
- difference of 10 and y -> 10 - y
- product of 3 and z -> 3z
- quotient of m and 4 -> m / 4
- five more than twice a number -> 2n + 5
- three less than four times a number -> 4n - 3

Always define the variable first, then build the expression step by step.`,
          },
        ],
      },
      {
        title: 'Solving Equations',
        lessons: [
          {
            title: 'One-Step Equations',
            content: `A one-step equation requires only one operation to solve. The goal is always
to isolate the variable on one side.

Golden Rule: whatever you do to one side, do to the other.

Examples:
x + 7 = 12 -> x = 5
y - 3 = 9 -> y = 12
3x = 15 -> x = 5
x / 4 = 6 -> x = 24

Always check your answer by substituting it back into the original equation.`,
          },
          {
            title: 'Two-Step Equations',
            content: `Two-step equations require two inverse operations. Undo addition or subtraction
first, then undo multiplication or division.

Example:
2x + 3 = 11
Subtract 3 -> 2x = 8
Divide by 2 -> x = 4

Word problem:
3n + 4 = 19
3n = 15
n = 5`,
          },
          {
            title: 'Equations with Variables on Both Sides',
            content: `When variables appear on both sides, move them to one side first.

Example:
5x + 2 = 3x + 10
Subtract 3x -> 2x + 2 = 10
Subtract 2 -> 2x = 8
Divide by 2 -> x = 4

Special cases:
- No solution: 2x + 3 = 2x + 7
- Infinite solutions: 3x + 6 = 3(x + 2)`,
          },
        ],
      },
      {
        title: 'Linear Functions & Graphing',
        lessons: [
          {
            title: 'Introduction to Functions',
            content: `A function is a rule that assigns exactly one output to each input.
Think of it as a machine: you put in x and you get out y.

Function notation:
f(x) = 2x + 1
f(3) = 7
f(0) = 1
f(-2) = -3

Use the vertical line test on graphs to determine whether a relation is a function.`,
          },
          {
            title: 'Slope and Y-Intercept',
            content: `The slope-intercept form of a line is y = mx + b.
- m is the slope
- b is the y-intercept

Slope between two points:
m = (y2 - y1) / (x2 - x1)

Slope types:
- positive
- negative
- zero
- undefined`,
          },
          {
            title: 'Graphing Linear Equations',
            content: `To graph a linear equation, start with the y-intercept and use the slope to
move up or down and left or right.

For y = 2x + 1:
- plot the point (0,1)
- use slope 2/1 to move up 2 and right 1
- connect the points with a straight line

Graphing helps you see how equations behave visually and compare multiple lines.`,
          },
        ],
      },
      {
        title: 'Systems and Inequalities',
        lessons: [
          {
            title: 'Solving Systems by Graphing',
            content: `A system of equations is a set of two or more equations solved together.
When graphed, the solution is the point where the lines intersect.

If the lines cross once, there is one solution.
If the lines are parallel, there is no solution.
If the lines are the same, there are infinitely many solutions.`,
          },
          {
            title: 'Substitution Method',
            content: `The substitution method works well when one equation already has a variable
isolated.

Example:
y = x + 2
2x + y = 11
Substitute x + 2 for y:
2x + x + 2 = 11
3x = 9
x = 3 and y = 5`,
          },
          {
            title: 'Linear Inequalities',
            content: `Inequalities compare quantities that may not be equal.

Symbols:
> greater than
< less than
>= greater than or equal to
<= less than or equal to

When multiplying or dividing by a negative number, reverse the inequality sign.
Graph solutions on a number line using open or closed circles.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Solving Linear Equations Practice',
        description:
          'Complete 20 solving problems covering one-step, two-step, and variable-on-both-sides equations. Show all work step by step. Due in 7 days from the seed date.',
        maxScore: 100,
        dueInDays: 7,
      },
      {
        title: 'Real-World Algebra Application',
        description:
          'Write a 1-page report describing 3 real-world situations where algebra is used (for example, calculating speed, budgeting money, or measuring ingredients). For each situation, write an equation and solve it.',
        maxScore: 50,
        dueInDays: 14,
      },
    ],
    quiz: {
      title: 'Algebra Fundamentals Quiz',
      timeLimit: 20,
      questions: [
        { text: 'What is the value of x in the equation 3x + 6 = 21?', options: ['4', '5', '6', '7'], correct: 'b', points: 2 },
        { text: 'Which of the following is an algebraic expression?', options: ['2+3=5', '4x-7', '15÷3', '100'], correct: 'b', points: 1 },
        { text: 'Solve for y: y/4 - 2 = 3', options: ['y=8', 'y=20', 'y=4', 'y=5'], correct: 'b', points: 2 },
        { text: 'The slope between points (1,2) and (3,8) is:', options: ['2', '3', '4', '6'], correct: 'b', points: 2 },
        { text: 'What is the y-intercept of y = 5x - 4?', options: ['5', '-4', '4', '-5'], correct: 'b', points: 1 },
        { text: "Translate: 'Seven less than twice a number'", options: ['7-2n', '2n-7', '2(n-7)', '7+2n'], correct: 'b', points: 1 },
        { text: 'If f(x) = 3x + 2, what is f(4)?', options: ['9', '12', '14', '18'], correct: 'c', points: 2 },
        { text: 'Which equation has NO solution?', options: ['2x+1=9', 'x+3=x+3', '2x+5=2x+8', '3x=12'], correct: 'c', points: 2 },
      ],
    },
  },
  {
    title: 'Introduction to Programming with Python',
    category: 'Computer Science',
    teacherEmail: 'david.kim@eduflow.com',
    description:
      'Learn Python syntax, control flow, functions, and core data structures through beginner-friendly examples.',
    keywords: ['variables', 'functions', 'loops', 'lists', 'Python'],
    sections: [
      {
        title: 'Python Basics',
        lessons: [
          {
            title: 'Your First Python Program',
            content: `Python is one of the world's most popular programming languages because of its
clean, readable syntax. Your very first program is:

print("Hello, World!")

The print() function displays text on the screen. The text inside quotes is a
string. Python is used for websites, automation, data analysis, AI, and more.`,
          },
          {
            title: 'Variables and Data Types',
            content: `Variables store data in your program.

Examples:
name = "Alice"
age = 16
height = 5.6
is_student = True

Python is dynamically typed, which means you do not declare the type manually.
Common types include strings, integers, floats, and booleans.`,
          },
          {
            title: 'User Input and Basic Operations',
            content: `Use input() to get information from the user.

name = input("What is your name? ")
print(f"Hello, {name}!")

Arithmetic operators:
+ addition
- subtraction
* multiplication
/ division
// floor division
% modulo
** exponent`,
          },
        ],
      },
      {
        title: 'Control Flow',
        lessons: [
          {
            title: 'If Statements',
            content: `If statements let your program make decisions.

if condition:
    ...
elif other_condition:
    ...
else:
    ...

Python uses indentation to define code blocks. Comparison operators include
==, !=, >, <, >=, and <=.`,
          },
          {
            title: 'Loops: For and While',
            content: `Loops repeat code multiple times.

FOR loop:
for i in range(5):
    print(i)

WHILE loop:
count = 0
while count < 5:
    print(count)
    count += 1

Use break to exit early and continue to skip to the next iteration.`,
          },
          {
            title: 'Functions',
            content: `Functions are reusable blocks of code.

def greet(name):
    return f"Hello, {name}!"

Functions help you avoid repetition and make programs easier to read, test,
and maintain.`,
          },
        ],
      },
      {
        title: 'Data Structures',
        lessons: [
          {
            title: 'Lists',
            content: `A list stores multiple values in order.

numbers = [1, 2, 3, 4, 5]
names = ["Alice", "Bob", "Charlie"]

Useful list methods:
- append()
- insert()
- remove()
- pop()
- sort()`,
          },
          {
            title: 'Tuples and Dictionaries',
            content: `Tuples are ordered collections that do not change after creation.

point = (4, 7)

Dictionaries store key-value pairs:
student = {"name": "Amina", "grade": 92}

Dictionaries are excellent for structured data because each value has a clear label.`,
          },
          {
            title: 'Sets and Membership',
            content: `Sets store unique values only.

colors = {"red", "blue", "green"}

Sets are useful for removing duplicates and checking membership quickly.
Use the in keyword to ask whether a value exists inside a collection.`,
          },
        ],
      },
      {
        title: 'Practical Programming',
        lessons: [
          {
            title: 'Debugging Basics',
            content: `Debugging means finding and fixing mistakes in code.

Common beginner bugs include:
- misspelled variable names
- bad indentation
- using = instead of ==
- forgetting type conversion for input()

Read error messages carefully. They usually tell you where to start.`,
          },
          {
            title: 'Working with Files',
            content: `Python can read and write files.

with open("notes.txt", "w", encoding="utf-8") as file:
    file.write("Hello")

The with statement automatically closes the file when you are done.`,
          },
          {
            title: 'Mini Project Planning',
            content: `Before writing a project, break the problem into smaller steps.

Ask:
- What inputs do I need?
- What output should the user see?
- Which functions can I create?
- How will I test the program?

Planning first leads to cleaner, less stressful coding sessions.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Python Calculator',
        description:
          'Build a Python calculator that performs addition, subtraction, multiplication, and division. Ask the user for two numbers and an operation, then display the result. Include error handling for division by zero. Submit your .py file.',
        maxScore: 100,
        dueInDays: 5,
      },
      {
        title: 'Student Grade Analyzer',
        description:
          'Write a Python program that takes a list of 5 test scores, calculates the average, highest score, lowest score, and assigns a letter grade based on the average. Use functions for each calculation and submit code with sample output.',
        maxScore: 100,
        dueInDays: 10,
      },
    ],
    quiz: {
      title: 'Python Basics Quiz',
      timeLimit: 25,
      questions: [
        { text: "What does print('Hello') do in Python?", options: ['Creates a variable', 'Displays text on screen', 'Gets user input', 'Defines a function'], correct: 'b', points: 1 },
        { text: 'Which data type is the value: is_valid = True?', options: ['String', 'Integer', 'Boolean', 'Float'], correct: 'c', points: 1 },
        { text: 'What is the output of: print(10 % 3)?', options: ['3', '1', '3.33', '0'], correct: 'b', points: 2 },
        { text: 'Which keyword is used to define a function in Python?', options: ['function', 'define', 'def', 'fn'], correct: 'c', points: 1 },
        { text: 'What does range(5) produce?', options: ['1,2,3,4,5', '0,1,2,3,4', '0,1,2,3,4,5', '1,2,3,4'], correct: 'b', points: 1 },
        { text: 'What is wrong with this code? if x = 5: print(x)', options: ['Should use ==, not =', 'Missing parentheses', 'print needs quotes', 'Nothing is wrong'], correct: 'a', points: 2 },
        { text: "How do you add an item to the end of a list called 'items'?", options: ['items.add(val)', 'items.push(val)', 'items.append(val)', 'items.insert(val)'], correct: 'c', points: 1 },
        { text: "What is the output of: name='John'; print(f'Hello {name}')?", options: ['Hello {name}', 'Hello name', 'Hello John', 'Error'], correct: 'c', points: 1 },
        { text: 'What does the break statement do inside a loop?', options: ['Pauses the loop', 'Skips to next iteration', 'Exits the loop completely', 'Restarts the loop'], correct: 'c', points: 2 },
        { text: 'Which of these is a valid variable name in Python?', options: ['2name', 'first-name', 'first_name', 'first name'], correct: 'c', points: 1 },
      ],
    },
  },
  {
    title: 'World History: Ancient Civilizations',
    category: 'History',
    teacherEmail: 'michael.thompson@eduflow.com',
    description:
      'Survey major ancient civilizations across Mesopotamia, Egypt, Greece, Rome, China, and the Americas.',
    keywords: ['civilization', 'empire', 'dynasty', 'law', 'trade'],
    sections: [
      {
        title: 'Mesopotamia and Egypt',
        lessons: [
          {
            title: 'The Cradle of Civilization: Mesopotamia',
            content: `Mesopotamia, the land between the Tigris and Euphrates rivers, is often called
the cradle of civilization. The Sumerians developed cuneiform writing, the wheel,
advanced irrigation systems, and one of the earliest law codes: the Code of Hammurabi.`,
          },
          {
            title: 'Ancient Egypt: Land of the Pharaohs',
            content: `Ancient Egypt thrived along the Nile River for more than 3,000 years.
The pharaoh was both political ruler and religious figure. Egyptians built the
pyramids, developed hieroglyphics, used papyrus, and practiced mummification.`,
          },
          {
            title: 'Religion, Trade, and Daily Life',
            content: `Both Mesopotamia and Egypt depended on rivers for farming, trade, and survival.
Religion shaped architecture, law, and burial customs. Artifacts show that daily
life included farming, craft production, long-distance trade, and organized labor.`,
          },
        ],
      },
      {
        title: 'Greece and Rome',
        lessons: [
          {
            title: 'Ancient Greece: Democracy and Philosophy',
            content: `Ancient Greece helped shape Western civilization. Athens experimented with
democracy, while thinkers like Socrates, Plato, and Aristotle developed
philosophical traditions that still influence the modern world.`,
          },
          {
            title: 'The Roman Empire',
            content: `Rome grew from a republic into a vast empire. Roman success came from military
organization, engineering, road systems, aqueducts, and law. The Pax Romana
brought long periods of stability before the western empire fell in 476 CE.`,
          },
          {
            title: 'Legacy of the Classical World',
            content: `Greek ideas about government, philosophy, and art blended with Roman systems of
law, engineering, and administration. Together, they shaped language, architecture,
education, politics, and literature for centuries.`,
          },
        ],
      },
      {
        title: 'Asia and the Americas',
        lessons: [
          {
            title: 'Ancient China: Dynasty and Innovation',
            content: `Chinese civilization developed along the Yellow River and produced major
innovations such as paper, printing, gunpowder, and the compass. Dynasties like
the Shang, Zhou, Qin, and Han helped unify and expand Chinese society.`,
          },
          {
            title: 'Ancient India and the Silk Road',
            content: `Ancient India produced major religious and intellectual traditions, including
Hinduism and Buddhism. Trade networks like the Silk Road connected India, China,
Central Asia, and the Mediterranean, moving goods and ideas across continents.`,
          },
          {
            title: 'Civilizations of the Ancient Americas',
            content: `Civilizations in the Americas, including the Maya, Aztec, and Inca, built cities,
developed agriculture, observed the stars, and created complex political systems.
Their histories show that advanced civilizations arose independently across the globe.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Compare Two Ancient Civilizations',
        description:
          'Write a 500-word essay comparing and contrasting any two civilizations studied in this course. Address geography, government, religion, and key achievements using specific historical facts.',
        maxScore: 100,
        dueInDays: 10,
      },
      {
        title: 'Historical Significance Timeline',
        description:
          'Create a visual timeline covering at least 15 major events from ancient history (3500 BCE to 500 CE). For each event, write a 2-sentence explanation of its historical significance.',
        maxScore: 75,
        dueInDays: 14,
      },
    ],
    quiz: {
      title: 'Ancient Civilizations Quiz',
      timeLimit: 20,
      questions: [
        { text: 'Where was Mesopotamia located?', options: ['Along the Nile River', 'Between the Tigris and Euphrates rivers', 'In central China', 'On the Italian peninsula'], correct: 'b', points: 1 },
        { text: 'Which writing system is associated with the Sumerians?', options: ['Hieroglyphics', 'Latin', 'Cuneiform', 'Sanskrit'], correct: 'c', points: 1 },
        { text: 'Who ruled ancient Egypt?', options: ['Consuls', 'Pharaohs', 'Senators', 'Shoguns'], correct: 'b', points: 1 },
        { text: 'Athens is best known for developing:', options: ['Feudalism', 'Democracy', 'Communism', 'Imperial bureaucracy'], correct: 'b', points: 1 },
        { text: 'Who became the first Roman Emperor?', options: ['Julius Caesar', 'Augustus', 'Nero', 'Hadrian'], correct: 'b', points: 1 },
        { text: 'Which dynasty first unified China?', options: ['Han', 'Qin', 'Zhou', 'Tang'], correct: 'b', points: 1 },
        { text: 'Paper is one of the major inventions credited to:', options: ['Ancient Rome', 'Ancient Egypt', 'Ancient China', 'Ancient Greece'], correct: 'c', points: 1 },
        { text: 'The Silk Road is best described as:', options: ['A Roman law code', 'A trade network connecting regions of Eurasia', 'An Egyptian pyramid', 'A Greek festival'], correct: 'b', points: 1 },
      ],
    },
  },
  {
    title: 'Biology: The Living World',
    category: 'Science',
    teacherEmail: 'fatima.alhassan@eduflow.com',
    description:
      'Explore cells, genetics, evolution, and ecosystems to understand how living systems function.',
    keywords: ['cells', 'DNA', 'genes', 'ecosystems', 'evolution'],
    sections: [
      {
        title: 'Cell Biology',
        lessons: [
          {
            title: 'The Cell: Basic Unit of Life',
            content: `The cell is the smallest unit that can carry out all processes of life.
Cell theory states that all living things are made of cells, cells are the
basic unit of life, and all cells come from pre-existing cells.

Key organelles include the nucleus, mitochondria, ribosomes, ER, Golgi body,
cell membrane, and lysosomes.`,
          },
          {
            title: 'Cell Division: Mitosis',
            content: `Mitosis produces two identical daughter cells used for growth and repair.
The stages are often remembered as PMAT:
- Prophase
- Metaphase
- Anaphase
- Telophase

Cytokinesis then separates the cytoplasm into two new cells.`,
          },
          {
            title: 'Cell Transport and Homeostasis',
            content: `Cells maintain balance by controlling what enters and exits the membrane.

Important transport processes:
- diffusion
- osmosis
- active transport

Homeostasis keeps internal conditions stable even when the external environment changes.`,
          },
        ],
      },
      {
        title: 'Genetics and Heredity',
        lessons: [
          {
            title: 'DNA: The Blueprint of Life',
            content: `DNA carries genetic instructions for living things. It has a double helix
structure and uses four nitrogen bases:
- Adenine
- Thymine
- Guanine
- Cytosine

A pairs with T and G pairs with C.`,
          },
          {
            title: 'Genes, Traits, and Punnett Squares',
            content: `Genes are segments of DNA that influence traits. In simple Mendelian genetics,
dominant and recessive alleles can be modeled with Punnett squares to predict
the probability of offspring inheriting certain traits.`,
          },
          {
            title: 'Mutations and Genetic Variation',
            content: `Mutations are changes in DNA sequence. Many are harmless, some are harmful,
and a few can be beneficial. Genetic variation helps populations adapt and is a
key ingredient in evolution over long periods of time.`,
          },
        ],
      },
      {
        title: 'Ecology and Evolution',
        lessons: [
          {
            title: 'Natural Selection',
            content: `Natural selection explains how traits that improve survival and reproduction
become more common in a population over time. Variation, inheritance, and
competition all play a role in this process.`,
          },
          {
            title: 'Food Chains and Ecosystems',
            content: `Ecosystems include organisms and their physical environments. Energy moves
through food chains and food webs from producers to consumers and decomposers.
Healthy ecosystems depend on balance and biodiversity.`,
          },
          {
            title: 'Human Impact on Living Systems',
            content: `Human activities such as pollution, habitat destruction, and climate change can
disrupt ecosystems. Conservation, sustainable practices, and scientific research
help protect biodiversity and ecological stability.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Cell Organelle Comparison',
        description:
          "Create a detailed comparison table of prokaryotic vs eukaryotic cells. Then write a paragraph explaining which cell type you think is 'better designed' and why, using at least 4 specific organelle examples to support your argument.",
        maxScore: 80,
        dueInDays: 6,
      },
      {
        title: 'Genetics Research Report',
        description:
          'Research one genetic disease or condition and write a 400-word report covering the genetic cause, symptoms, inheritance pattern, current treatments, and ethical considerations in genetic testing.',
        maxScore: 100,
        dueInDays: 12,
      },
    ],
    quiz: {
      title: 'Cell Biology and Genetics Quiz',
      timeLimit: 20,
      questions: [
        { text: 'What is the basic unit of life?', options: ['Atom', 'Cell', 'Organ', 'Tissue'], correct: 'b', points: 1 },
        { text: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Mitochondrion', 'Golgi apparatus', 'Ribosome'], correct: 'b', points: 1 },
        { text: 'Mitosis produces how many daughter cells?', options: ['1', '2', '3', '4'], correct: 'b', points: 1 },
        { text: 'In DNA, adenine pairs with:', options: ['Cytosine', 'Guanine', 'Thymine', 'Uracil'], correct: 'c', points: 1 },
        { text: 'A gene is best defined as:', options: ['A type of cell', 'A segment of DNA', 'A protein', 'A chromosome'], correct: 'b', points: 1 },
        { text: 'Which process moves water across a membrane?', options: ['Digestion', 'Respiration', 'Osmosis', 'Translation'], correct: 'c', points: 1 },
        { text: 'Mutations are:', options: ['Changes in DNA sequence', 'Only always harmful', 'A type of organelle', 'Another word for proteins'], correct: 'a', points: 1 },
        { text: 'Natural selection depends on variation within a population.', options: ['True', 'False', 'Only in plants', 'Only in animals'], correct: 'a', points: 1 },
      ],
    },
  },
  {
    title: 'English Literature: Short Stories & Essays',
    category: 'English',
    teacherEmail: 'priya.sharma@eduflow.com',
    description:
      'Develop literary analysis and academic writing skills through short fiction, essays, and close reading.',
    keywords: ['theme', 'conflict', 'essay', 'symbolism', 'narrative'],
    sections: [
      {
        title: 'Understanding Narrative',
        lessons: [
          {
            title: 'Elements of a Short Story',
            content: `A short story is a brief work of fiction that usually focuses on a single
incident, character, or theme. The essential elements are plot, character,
setting, conflict, and theme.

Plot often includes exposition, rising action, climax, falling action, and resolution.`,
          },
          {
            title: 'Literary Devices',
            content: `Writers use literary devices to create meaning and emotion.

Examples include:
- simile
- metaphor
- personification
- symbolism
- irony
- foreshadowing

These devices help readers interpret the deeper meaning of a text.`,
          },
          {
            title: 'Point of View and Voice',
            content: `Point of view shapes how readers receive a story.

Common perspectives:
- first person
- third person limited
- third person omniscient

Narrative voice can influence tone, reliability, and emotional distance.`,
          },
        ],
      },
      {
        title: 'Essay Writing',
        lessons: [
          {
            title: 'The Five-Paragraph Essay',
            content: `The five-paragraph essay provides a clear structure for academic writing:
- introduction
- body paragraph 1
- body paragraph 2
- body paragraph 3
- conclusion

Each body paragraph should connect directly to the thesis.`,
          },
          {
            title: 'Building Strong Thesis Statements',
            content: `A thesis should be arguable, specific, and clear.

Weak thesis:
This essay will discuss symbolism.

Stronger thesis:
The green light in The Great Gatsby symbolizes the unattainable nature of the
American Dream and the power of longing itself.`,
          },
          {
            title: 'Using Evidence and Commentary',
            content: `Effective essays pair quotations or examples with commentary.

A strong body paragraph:
- introduces a point
- presents evidence
- explains how the evidence supports the claim
- links back to the thesis

Analysis matters more than summary.`,
          },
        ],
      },
      {
        title: 'Reading and Revision',
        lessons: [
          {
            title: 'Close Reading Strategies',
            content: `Close reading means paying attention to word choice, structure, imagery, and tone.
Ask what stands out, what repeats, and how details contribute to the overall message.
Annotating while reading helps capture important observations.`,
          },
          {
            title: 'Drafting and Revising',
            content: `Writing improves through revision. Strong revision checks organization, clarity,
evidence, transitions, and sentence variety before focusing on grammar and polish.
Good writers expect to rework their drafts.`,
          },
          {
            title: 'Peer Review and Reflection',
            content: `Peer review helps writers notice what readers understand and where they get lost.
Constructive feedback should identify strengths, ask questions, and suggest concrete
ways to clarify ideas without rewriting the work for someone else.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Short Story Analysis',
        description:
          'Choose any short story you have read. Write a 500-word analytical essay identifying the theme, the protagonist conflict, and two literary devices the author uses. Include direct quotes and explain how they support the theme.',
        maxScore: 100,
        dueInDays: 8,
      },
      {
        title: 'Original Short Story',
        description:
          'Write an original short story of 600-800 words. Include a clear conflict, at least two literary devices labeled in brackets, a character who changes, and a theme statement at the top of your submission.',
        maxScore: 100,
        dueInDays: 16,
      },
    ],
    quiz: {
      title: 'Short Stories and Essays Quiz',
      timeLimit: 20,
      questions: [
        { text: 'Which of the following is part of plot structure?', options: ['Theme', 'Climax', 'Mood', 'Diction'], correct: 'b', points: 1 },
        { text: 'A direct comparison without like or as is a:', options: ['Simile', 'Metaphor', 'Hyperbole', 'Alliteration'], correct: 'b', points: 1 },
        { text: 'The main argument of an essay is called the:', options: ['Caption', 'Thesis', 'Hook', 'Citation'], correct: 'b', points: 1 },
        { text: 'Which paragraph type usually restates the thesis?', options: ['Body', 'Conclusion', 'Outline', 'Evidence'], correct: 'b', points: 1 },
        { text: 'Foreshadowing is used to:', options: ['Repeat a sentence', 'Hint at future events', 'Describe the setting', 'Name the protagonist'], correct: 'b', points: 1 },
        { text: 'A protagonist is:', options: ['The theme of the story', 'The main character', 'The narrator only', 'The setting'], correct: 'b', points: 1 },
        { text: 'TEEL is a useful structure for:', options: ['Editing only', 'Body paragraphs', 'Book covers', 'Dialogue punctuation'], correct: 'b', points: 1 },
        { text: 'Close reading focuses on:', options: ['Reading faster', 'Memorizing dates', 'Detailed analysis of language and structure', 'Skipping difficult passages'], correct: 'c', points: 1 },
      ],
    },
  },
  {
    title: 'Introduction to Physics',
    category: 'Science',
    teacherEmail: 'robert.chen@eduflow.com',
    description:
      'Investigate motion, forces, energy, and waves through foundational physics concepts and real-world examples.',
    keywords: ['force', 'motion', 'energy', 'waves', 'acceleration'],
    sections: [
      {
        title: 'Forces & Motion',
        lessons: [
          {
            title: "Newton's Laws of Motion",
            content: `Newton's three laws explain how forces affect motion. Objects remain at rest or
in uniform motion unless acted on by a net force. Force equals mass times acceleration,
and every action has an equal and opposite reaction.`,
          },
          {
            title: 'Velocity and Acceleration',
            content: `Velocity describes speed with direction. Acceleration measures how quickly velocity
changes. Positive acceleration, negative acceleration, and changing direction all count
as acceleration in physics.`,
          },
          {
            title: 'Free-Body Diagrams',
            content: `Free-body diagrams help visualize the forces acting on an object. Labeling weight,
normal force, friction, tension, and applied forces can make problem solving clearer.`,
          },
        ],
      },
      {
        title: 'Energy',
        lessons: [
          {
            title: 'Work and the Work-Energy Theorem',
            content: `Work happens when a force causes displacement. The work-energy theorem states that
the net work done on an object equals its change in kinetic energy.`,
          },
          {
            title: 'Potential and Kinetic Energy',
            content: `Kinetic energy is the energy of motion, while potential energy is stored energy.
Gravitational potential energy depends on height, mass, and gravity. Energy can transfer
between forms without disappearing.`,
          },
          {
            title: 'Conservation of Energy',
            content: `Energy cannot be created or destroyed, only transferred or transformed. In closed
systems, the total amount of energy remains constant even as it changes form.`,
          },
        ],
      },
      {
        title: 'Waves & Sound',
        lessons: [
          {
            title: 'Wave Properties',
            content: `Waves carry energy through matter or space. Important wave properties include
wavelength, frequency, amplitude, and speed.`,
          },
          {
            title: 'Sound Waves',
            content: `Sound is a mechanical wave that travels through a medium. Pitch depends on frequency,
while volume depends on amplitude.`,
          },
          {
            title: 'Reflection and Interference',
            content: `Waves can reflect, refract, diffract, and interfere with one another. Constructive
interference increases amplitude, while destructive interference reduces it.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Motion Lab Analysis',
        description:
          'Analyze the motion of a rolling object using distance-time data. Calculate average velocity, identify periods of acceleration, and explain which forces are acting on the object.',
        maxScore: 100,
        dueInDays: 7,
      },
      {
        title: 'Energy in Everyday Life',
        description:
          'Create a short presentation explaining three examples of energy transformation in daily life. Include at least one example involving sound or waves.',
        maxScore: 80,
        dueInDays: 13,
      },
    ],
    quiz: {
      title: 'Introduction to Physics Quiz',
      timeLimit: 20,
      questions: [
        { text: 'Force is equal to:', options: ['mass + acceleration', 'mass x acceleration', 'mass / acceleration', 'velocity x time'], correct: 'b', points: 1 },
        { text: 'Velocity differs from speed because velocity includes:', options: ['Mass', 'Direction', 'Energy', 'Distance only'], correct: 'b', points: 1 },
        { text: 'The work-energy theorem links work to:', options: ['Temperature', 'Density', 'Change in kinetic energy', 'Volume'], correct: 'c', points: 1 },
        { text: 'Which type of energy is stored energy?', options: ['Kinetic', 'Potential', 'Thermal only', 'Wave'], correct: 'b', points: 1 },
        { text: 'Energy can be created from nothing.', options: ['True', 'False', 'Only in physics labs', 'Only in space'], correct: 'b', points: 1 },
        { text: 'Sound waves require a medium to travel.', options: ['True', 'False', 'Only in water', 'Only in air'], correct: 'a', points: 1 },
        { text: 'Frequency affects the _____ of a sound.', options: ['Mass', 'Pitch', 'Color', 'Weight'], correct: 'b', points: 1 },
        { text: 'Constructive interference causes amplitude to:', options: ['Disappear', 'Decrease', 'Increase', 'Reverse'], correct: 'c', points: 1 },
      ],
    },
  },
  {
    title: 'Geography: Our Planet Earth',
    category: 'Geography',
    teacherEmail: 'carlos.martinez@eduflow.com',
    description:
      'Study Earth systems, population patterns, and environmental issues across physical and human geography.',
    keywords: ['tectonics', 'climate', 'population', 'urbanization', 'environment'],
    sections: [
      {
        title: 'Physical Geography',
        lessons: [
          {
            title: 'Plate Tectonics',
            content: `Earth's crust is divided into tectonic plates that move slowly over time. Their
movement can create mountains, earthquakes, volcanic activity, and ocean trenches.`,
          },
          {
            title: 'Landforms and Water Systems',
            content: `Physical geography studies mountains, plains, rivers, coastlines, and deserts.
Water systems shape landscapes through weathering, erosion, and deposition.`,
          },
          {
            title: 'Climate Zones',
            content: `Climate zones are influenced by latitude, altitude, ocean currents, and prevailing
winds. Major climate patterns affect ecosystems, agriculture, and human settlement.`,
          },
        ],
      },
      {
        title: 'Human Geography',
        lessons: [
          {
            title: 'Population Distribution',
            content: `Population is not evenly distributed across Earth. People tend to live near water,
fertile land, resources, transportation routes, and economic opportunity.`,
          },
          {
            title: 'Urbanization',
            content: `Urbanization is the growth of cities and towns. It can create jobs and services,
but it can also increase congestion, pollution, and pressure on infrastructure.`,
          },
          {
            title: 'Culture and Migration',
            content: `Migration changes the geographic distribution of people and ideas. Push and pull
factors influence movement, while culture shapes language, traditions, and land use.`,
          },
        ],
      },
      {
        title: 'Environmental Issues',
        lessons: [
          {
            title: 'Climate Change',
            content: `Climate change refers to long-term shifts in temperature and weather patterns.
Human activity, especially greenhouse gas emissions, is a major driver of recent warming.`,
          },
          {
            title: 'Deforestation and Biodiversity',
            content: `Deforestation removes habitats, alters local climates, and reduces biodiversity.
Protecting forests supports carbon storage, water cycles, and wildlife populations.`,
          },
          {
            title: 'Sustainability and Global Action',
            content: `Sustainability means meeting present needs without harming the ability of future
generations to meet theirs. Solutions include renewable energy, conservation,
responsible consumption, and international cooperation.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Climate Zones Infographic',
        description:
          'Design an infographic comparing at least four global climate zones. Include defining weather patterns, common vegetation, and one country or region for each zone.',
        maxScore: 90,
        dueInDays: 9,
      },
      {
        title: 'Urbanization Case Study',
        description:
          'Choose one major city and write a case study on how urbanization has affected housing, transportation, and the environment. Include at least three geographic terms from class.',
        maxScore: 100,
        dueInDays: 15,
      },
    ],
    quiz: {
      title: 'Our Planet Earth Quiz',
      timeLimit: 20,
      questions: [
        { text: 'Plate tectonics helps explain:', options: ['Photosynthesis', 'Earthquakes and mountain building', 'Poetry', 'Cell division'], correct: 'b', points: 1 },
        { text: 'Climate zones are strongly influenced by:', options: ['Latitude', 'Homework only', 'Alphabet order', 'Population charts only'], correct: 'a', points: 1 },
        { text: 'Human geography studies:', options: ['Only rocks', 'People, culture, and settlement patterns', 'Only stars', 'Chemical reactions'], correct: 'b', points: 1 },
        { text: 'Urbanization refers to:', options: ['Forest growth', 'The spread and growth of cities', 'Ocean currents', 'Desertification only'], correct: 'b', points: 1 },
        { text: 'A major cause of recent climate change is:', options: ['Greenhouse gas emissions', 'Moonlight', 'Tides only', 'Magnetism'], correct: 'a', points: 1 },
        { text: 'Deforestation often reduces:', options: ['Language diversity', 'Biodiversity', 'Gravity', 'Latitude'], correct: 'b', points: 1 },
        { text: 'Migration can be influenced by push and pull factors.', options: ['True', 'False', 'Only in ancient times', 'Only in rural areas'], correct: 'a', points: 1 },
        { text: 'Sustainability is about:', options: ['Using resources with no long-term plan', 'Meeting present needs without harming the future', 'Avoiding geography', 'Building only cities'], correct: 'b', points: 1 },
      ],
    },
  },
  {
    title: 'Art History & Appreciation',
    category: 'Art',
    teacherEmail: 'amelia.johnson@eduflow.com',
    description:
      'Trace the development of visual art from ancient traditions to contemporary movements and criticism.',
    keywords: ['renaissance', 'sculpture', 'impressionism', 'abstract', 'contemporary art'],
    sections: [
      {
        title: 'Ancient to Renaissance',
        lessons: [
          {
            title: 'Cave Paintings and Early Expression',
            content: `Some of the earliest known artworks are cave paintings that recorded animals,
movement, and ritual life. These works show that visual storytelling has been part
of human culture for thousands of years.`,
          },
          {
            title: 'Greek Sculpture and Ideal Form',
            content: `Ancient Greek artists emphasized balance, proportion, and idealized human form.
Their sculptures influenced later art through attention to anatomy and harmony.`,
          },
          {
            title: 'Renaissance Masters',
            content: `Renaissance artists such as Leonardo da Vinci, Michelangelo, and Raphael combined
technical skill with humanist ideas. Their use of perspective, anatomy, and composition
transformed Western art.`,
          },
        ],
      },
      {
        title: 'Modern Art',
        lessons: [
          {
            title: 'Impressionism',
            content: `Impressionist painters captured light, atmosphere, and fleeting moments using
visible brushstrokes and outdoor scenes. Artists such as Monet and Renoir challenged
older academic conventions.`,
          },
          {
            title: 'Post-Impressionism and Expression',
            content: `Post-Impressionist artists built on Impressionism but explored stronger color,
symbolism, and emotion. Van Gogh, Cezanne, and Gauguin each pushed art in new directions.`,
          },
          {
            title: 'Abstract Art',
            content: `Abstract art moves away from realistic representation and focuses on color, form,
line, and movement. Artists use abstraction to express emotion, rhythm, or pure visual ideas.`,
          },
        ],
      },
      {
        title: 'Contemporary Art',
        lessons: [
          {
            title: 'Installation and Conceptual Art',
            content: `Contemporary artists often create installations that transform space and invite
viewer participation. In conceptual art, the idea behind the work can be as important
as the physical object itself.`,
          },
          {
            title: 'Photography and Digital Media',
            content: `Modern tools have expanded what counts as art. Photography, video, and digital
media allow artists to document, manipulate, and remix visual experiences in powerful ways.`,
          },
          {
            title: 'How to Critique Artwork',
            content: `Art criticism often begins with four steps: describe, analyze, interpret, and judge.
Looking carefully at composition, color, technique, context, and purpose helps viewers
form deeper and more thoughtful responses.`,
          },
        ],
      },
    ],
    assignments: [
      {
        title: 'Artwork Comparison Essay',
        description:
          'Compare two artworks from different historical periods. Explain how style, materials, subject matter, and cultural context differ, and include a brief personal response.',
        maxScore: 100,
        dueInDays: 8,
      },
      {
        title: 'Curate a Mini Exhibition',
        description:
          'Create a themed mini exhibition of five artworks from this course. Write a curator statement explaining the theme and a short label for each selected work.',
        maxScore: 90,
        dueInDays: 15,
      },
    ],
    quiz: {
      title: 'Art History and Appreciation Quiz',
      timeLimit: 20,
      questions: [
        { text: 'Cave paintings are important because they show:', options: ['Ancient visual storytelling', 'Modern advertising', 'Digital animation', 'Only architecture'], correct: 'a', points: 1 },
        { text: 'Greek sculpture is known for emphasizing:', options: ['Ideal form and proportion', 'Only abstract color', 'Photography', 'Street signs'], correct: 'a', points: 1 },
        { text: 'Which period is associated with Leonardo and Michelangelo?', options: ['Renaissance', 'Impressionism', 'Baroque music only', 'Cubism'], correct: 'a', points: 1 },
        { text: 'Impressionist artists were especially interested in:', options: ['Exact political speeches', 'Light and atmosphere', 'Computer code', 'Stone carving only'], correct: 'b', points: 1 },
        { text: 'Abstract art focuses on:', options: ['Only realistic portraits', 'Color, form, and non-literal ideas', 'Strictly written essays', 'Maps'], correct: 'b', points: 1 },
        { text: 'Conceptual art often emphasizes:', options: ['The idea behind the work', 'Only expensive materials', 'Only realism', 'Only ancient myths'], correct: 'a', points: 1 },
        { text: 'Digital media can be part of contemporary art.', options: ['True', 'False', 'Only in museums', 'Only in textbooks'], correct: 'a', points: 1 },
        { text: 'A common first step in art critique is to:', options: ['Judge immediately', 'Describe what you see', 'Guess the price', 'Ignore the work'], correct: 'b', points: 1 },
      ],
    },
  },
];

const enrollmentDistribution = [
  [0, 34],
  [4, 39],
  [0, 29],
  [9, 44],
  [14, 49],
  [0, 24],
  [19, 49],
  [24, 49],
];

const buildUserSeedRows = async () => {
  const hashedAdmin = await bcrypt.hash('Admin123!', 12);
  const hashedTeacher = await bcrypt.hash('Teacher123!', 12);
  const hashedStudent = await bcrypt.hash('Student123!', 12);

  const adminCreatedAt = daysAgo(72);
  const admin = [
    {
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'admin@eduflow.com',
      password: hashedAdmin,
      role: 'admin',
      createdAt: adminCreatedAt,
      updatedAt: adminCreatedAt,
    },
  ];

  const teachers = teachersSeed.map(([firstName, lastName, email], index) => {
    const createdAt = daysAgo(randInt(35, 65) + index);
    return {
      firstName,
      lastName,
      email,
      password: hashedTeacher,
      role: 'teacher',
      createdAt,
      updatedAt: createdAt,
    };
  });

  const students = studentsSeed.map(([firstName, lastName, email], index) => {
    const createdAt = daysAgo(randInt(2, 55) + Math.floor(index / 6));
    return {
      firstName,
      lastName,
      email,
      password: hashedStudent,
      role: 'student',
      createdAt,
      updatedAt: createdAt,
    };
  });

  return { admin, teachers, students };
};

const createUsers = async () => {
  console.log('👤 Creating users...');

  const { admin, teachers, students } = await buildUserSeedRows();
  await User.bulkCreate([...admin, ...teachers, ...students], { validate: true });

  const allUsers = await User.findAll({
    order: [['createdAt', 'ASC']],
  });

  return {
    users: allUsers,
    admin: allUsers.find((user) => user.role === 'admin'),
    teachers: allUsers.filter((user) => user.role === 'teacher'),
    students: allUsers.filter((user) => user.role === 'student'),
  };
};

const createCourses = async (teacherByEmail) => {
  console.log('📚 Creating courses...');

  const courseContexts = [];

  for (const blueprint of courseBlueprints) {
    const teacher = teacherByEmail.get(blueprint.teacherEmail);
    const course = await Course.create({
      title: blueprint.title,
      description: blueprint.description,
      teacherId: teacher.id,
      isPublished: true,
      category: blueprint.category,
    });

    const sectionModels = [];
    const lessonModels = [];

    for (const [sectionIndex, sectionBlueprint] of blueprint.sections.entries()) {
      const section = await Section.create({
        title: sectionBlueprint.title,
        order: sectionIndex + 1,
        courseId: course.id,
      });

      sectionModels.push(section);

      for (const [lessonIndex, lessonBlueprint] of sectionBlueprint.lessons.entries()) {
        const lesson = await Lesson.create({
          title: lessonBlueprint.title,
          content: lessonBlueprint.content,
          order: lessonIndex + 1,
          sectionId: section.id,
          courseId: course.id,
        });

        lessonModels.push(lesson);
      }
    }

    const assignments = [];
    for (const [assignmentIndex, assignmentBlueprint] of blueprint.assignments.entries()) {
      const dueDate = daysFromNow(assignmentBlueprint.dueInDays);
      const postedAt = new Date(
        Math.min(
          now.getTime() - randInt(1, 4) * DAY_IN_MS,
          dueDate.getTime() - randInt(4, 10) * DAY_IN_MS
        )
      );

      const assignment = await Assignment.create({
        title: assignmentBlueprint.title,
        description: assignmentBlueprint.description,
        dueDate,
        maxScore: assignmentBlueprint.maxScore,
        courseId: course.id,
        teacherId: teacher.id,
      });

      assignments.push({
        model: assignment,
        order: assignmentIndex + 1,
        postedAt,
      });
    }

    const quiz = await Quiz.create({
      title: blueprint.quiz.title,
      timeLimit: blueprint.quiz.timeLimit,
      courseId: course.id,
    });

    const questionModels = [];
    for (const [questionIndex, questionBlueprint] of blueprint.quiz.questions.entries()) {
      const question = await Question.create({
        text: questionBlueprint.text,
        options: buildOptions(questionBlueprint.options),
        correctOption: questionBlueprint.correct,
        points: questionBlueprint.points,
        order: questionIndex + 1,
        quizId: quiz.id,
      });
      questionModels.push(question);
    }

    courseContexts.push({
      blueprint,
      course,
      teacher,
      sections: sectionModels,
      lessons: lessonModels,
      assignments,
      quiz,
      questions: questionModels,
    });
  }

  return courseContexts;
};

const createEnrollments = async (courseContexts, students) => {
  console.log('🎓 Creating enrollments...');

  const enrollmentRows = [];

  courseContexts.forEach((courseContext, courseIndex) => {
    const [startIndex, endIndex] = enrollmentDistribution[courseIndex];
    const selectedStudents = students.slice(startIndex, endIndex + 1);

    selectedStudents.forEach((student) => {
      enrollmentRows.push({
        studentId: student.id,
        courseId: courseContext.course.id,
        enrolledAt: randDate(daysAgo(90), daysAgo(30)),
        completionPercentage: 0,
      });
    });
  });

  await Enrollment.bulkCreate(enrollmentRows, { validate: true });
  return Enrollment.findAll({
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title'],
      },
    ],
    order: [['enrolledAt', 'ASC']],
  });
};

const pickCompletionCount = (lessonCount) => {
  const roll = Math.random();

  if (roll < 0.3) {
    return lessonCount;
  }
  if (roll < 0.7) {
    return clamp(Math.round((randInt(50, 80) / 100) * lessonCount), 0, lessonCount);
  }
  if (roll < 0.9) {
    return clamp(Math.round((randInt(10, 49) / 100) * lessonCount), 0, lessonCount);
  }

  return clamp(Math.round((randInt(0, 9) / 100) * lessonCount), 0, lessonCount);
};

const createLessonProgress = async (courseContexts, enrollments) => {
  console.log('📊 Creating progress data...');

  const courseById = new Map(courseContexts.map((entry) => [entry.course.id, entry]));
  const progressRows = [];
  const completedCountByEnrollmentId = new Map();

  for (const enrollment of enrollments) {
    const courseContext = courseById.get(enrollment.courseId);
    const lessons = courseContext.lessons;
    const completionCount = pickCompletionCount(lessons.length);
    const completedLessons = sampleUnique(lessons, completionCount);

    completedLessons.forEach((lesson) => {
      progressRows.push({
        studentId: enrollment.studentId,
        lessonId: lesson.id,
        courseId: enrollment.courseId,
        completedAt: randDate(new Date(enrollment.enrolledAt), now),
      });
    });

    completedCountByEnrollmentId.set(enrollment.id, completedLessons.length);
  }

  if (progressRows.length > 0) {
    await LessonProgress.bulkCreate(progressRows, { validate: true });
  }

  for (const enrollment of enrollments) {
    const lessonCount = courseById.get(enrollment.courseId).lessons.length;
    const completedLessons = completedCountByEnrollmentId.get(enrollment.id) || 0;
    enrollment.completionPercentage = lessonCount
      ? round((completedLessons / lessonCount) * 100)
      : 0;
    await enrollment.save();
  }

  return LessonProgress.findAll();
};

const buildSubmissionText = (courseContext) => {
  const template = randItem(submissionTexts);
  const lessonNumber = randInt(1, courseContext.lessons.length);
  const topic = randItem(courseContext.blueprint.keywords);
  const aspect = randItem(courseContext.blueprint.keywords);
  const concept = randItem(courseContext.blueprint.keywords);

  return template
    .replace('[topic]', topic)
    .replace('[aspect]', aspect)
    .replace('[concept]', concept)
    .replace('[N]', String(lessonNumber))
    .replace('[X]', String(randInt(2, 6)));
};

const pickAssignmentScoreTier = (studentId, assignmentOrder) => {
  const tier = getStudentTier(studentId);
  const roll = Math.random();

  if (assignmentOrder === 1) {
    if (tier === 'high') {
      return roll < 0.7 ? 'high' : 'mid';
    }
    if (tier === 'mid') {
      return roll < 0.25 ? 'high' : roll < 0.75 ? 'mid' : 'low';
    }
    if (tier === 'low') {
      return roll < 0.2 ? 'mid' : roll < 0.8 ? 'low' : 'failing';
    }
    return roll < 0.35 ? 'low' : 'failing';
  }

  if (tier === 'high') {
    return roll < 0.6 ? 'high' : 'mid';
  }
  if (tier === 'mid') {
    return roll < 0.2 ? 'high' : roll < 0.7 ? 'mid' : 'low';
  }
  if (tier === 'low') {
    return roll < 0.15 ? 'mid' : roll < 0.7 ? 'low' : 'failing';
  }

  return roll < 0.3 ? 'low' : 'failing';
};

const buildFeedback = (score, maxScore, courseContext) => {
  const percentage = maxScore ? (score / maxScore) * 100 : 0;
  const replacements = {
    '[specific aspect]': randItem(courseContext.blueprint.keywords),
    '[point]': randItem(courseContext.blueprint.keywords),
    '[topic]': randItem(courseContext.blueprint.keywords),
  };

  const base =
    percentage >= 80 ? randItem(highFeedback) : percentage >= 60 ? randItem(midFeedback) : randItem(lowFeedback);

  return Object.entries(replacements).reduce(
    (text, [needle, replacement]) => text.replace(needle, replacement),
    base
  );
};

const createSubmissions = async (courseContexts, enrollments) => {
  console.log('✅ Creating submissions and grades...');

  const courseById = new Map(courseContexts.map((entry) => [entry.course.id, entry]));
  const enrollmentMap = enrollments.reduce((map, enrollment) => {
    if (!map.has(enrollment.courseId)) {
      map.set(enrollment.courseId, []);
    }
    map.get(enrollment.courseId).push(enrollment);
    return map;
  }, new Map());

  const submissionRows = [];
  const submissionEvents = [];

  for (const courseContext of courseContexts) {
    const courseEnrollments = enrollmentMap.get(courseContext.course.id) || [];

    for (const assignmentEntry of courseContext.assignments) {
      const shouldSubmitProbability = assignmentEntry.order === 1 ? 0.9 : 0.75;
      const shouldGradeProbability = assignmentEntry.order === 1 ? 0.8 : 0.6;

      for (const enrollment of courseEnrollments) {
        if (!randBool(shouldSubmitProbability)) {
          continue;
        }

        const assignment = assignmentEntry.model;
        const latestOnTimeDate = new Date(Math.min(now.getTime(), new Date(assignment.dueDate).getTime()));
        const submittedAt = randDate(new Date(enrollment.enrolledAt), latestOnTimeDate);
        const isGraded = randBool(shouldGradeProbability);
        const scoreTier = pickAssignmentScoreTier(enrollment.studentId, assignmentEntry.order);
        const score = isGraded ? generateScore(assignment.maxScore, scoreTier) : null;
        const latestGradeTimestamp = new Date(
          Math.min(now.getTime(), submittedAt.getTime() + randInt(1, 7) * DAY_IN_MS)
        );
        const gradedAt = isGraded
          ? randDate(submittedAt, latestGradeTimestamp)
          : null;

        submissionRows.push({
          content: buildSubmissionText(courseContext),
          filePath: null,
          score,
          feedback: isGraded ? buildFeedback(score, assignment.maxScore, courseContext) : null,
          status: isGraded ? 'graded' : 'submitted',
          submittedAt,
          assignmentId: assignment.id,
          studentId: enrollment.studentId,
        });

        submissionEvents.push({
          assignment,
          course: courseContext.course,
          teacher: courseContext.teacher,
          studentId: enrollment.studentId,
          submittedAt,
          gradedAt,
          score,
          status: isGraded ? 'graded' : 'submitted',
        });
      }
    }
  }

  let createdSubmissions = [];
  if (submissionRows.length > 0) {
    createdSubmissions = await Submission.bulkCreate(submissionRows, { validate: true, returning: true });
  }

  submissionEvents.forEach((event, index) => {
    event.submission = createdSubmissions[index];
  });

  return submissionEvents;
};

const determineQuizPerformanceTier = (studentId) => {
  const studentTier = getStudentTier(studentId);
  const roll = Math.random();

  if (studentTier === 'high') {
    return roll < 0.65 ? 'high' : 'average';
  }
  if (studentTier === 'mid') {
    return roll < 0.15 ? 'high' : roll < 0.75 ? 'average' : 'struggling';
  }
  if (studentTier === 'low') {
    return roll < 0.25 ? 'average' : 'struggling';
  }
  return roll < 0.15 ? 'average' : 'struggling';
};

const buildQuizAnswers = (questions, tier) => {
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const questionCount = sortedQuestions.length;

  let correctTarget;
  if (tier === 'high') {
    correctTarget = randInt(Math.max(1, Math.ceil(questionCount * 0.8)), questionCount);
  } else if (tier === 'average') {
    correctTarget = randInt(Math.max(1, Math.ceil(questionCount * 0.5)), Math.max(1, Math.floor(questionCount * 0.7)));
  } else {
    correctTarget = randInt(1, Math.max(1, Math.floor(questionCount * 0.49)));
  }

  const correctQuestions = new Set(sampleUnique(sortedQuestions, correctTarget).map((question) => question.id));
  const answers = {};
  let earnedPoints = 0;

  sortedQuestions.forEach((question) => {
    if (correctQuestions.has(question.id)) {
      answers[question.id] = question.correctOption;
      earnedPoints += Number(question.points || 0);
      return;
    }

    const wrongOptions = question.options
      .map((option) => option.id)
      .filter((optionId) => optionId !== question.correctOption);
    answers[question.id] = randItem(wrongOptions);
  });

  const totalPoints = sortedQuestions.reduce((total, question) => total + Number(question.points || 0), 0);
  return {
    answers,
    score: totalPoints ? round((earnedPoints / totalPoints) * 100) : 0,
  };
};

const createQuizAttempts = async (courseContexts, enrollments) => {
  console.log('🧠 Creating quiz attempts...');

  const courseById = new Map(courseContexts.map((entry) => [entry.course.id, entry]));
  const attemptRows = [];
  const attemptEvents = [];

  for (const enrollment of enrollments) {
    if (!randBool(0.7)) {
      continue;
    }

    const courseContext = courseById.get(enrollment.courseId);
    const performanceTier = determineQuizPerformanceTier(enrollment.studentId);
    const result = buildQuizAnswers(courseContext.questions, performanceTier);
    const completedAt = randDate(new Date(enrollment.enrolledAt), now);

    attemptRows.push({
      studentId: enrollment.studentId,
      quizId: courseContext.quiz.id,
      answers: result.answers,
      score: result.score,
      completedAt,
    });

    attemptEvents.push({
      course: courseContext.course,
      quiz: courseContext.quiz,
      studentId: enrollment.studentId,
      completedAt,
      score: result.score,
    });
  }

  let createdAttempts = [];
  if (attemptRows.length > 0) {
    createdAttempts = await QuizAttempt.bulkCreate(attemptRows, { validate: true, returning: true });
  }

  attemptEvents.forEach((event, index) => {
    event.attempt = createdAttempts[index];
  });

  return attemptEvents;
};

const createNotifications = async (courseContexts, enrollments, submissionEvents, quizAttemptEvents) => {
  console.log('🔔 Creating notifications...');

  const courseById = new Map(courseContexts.map((entry) => [entry.course.id, entry]));
  const notifications = [];

  enrollments.forEach((enrollment) => {
    const courseContext = courseById.get(enrollment.courseId);
    const enrolledAt = new Date(enrollment.enrolledAt);

    notifications.push({
      userId: enrollment.studentId,
      title: 'Course enrollment confirmed',
      message: `Welcome to ${courseContext.course.title}! We're glad to have you. Start with Lesson 1 when you're ready.`,
      type: 'enrollment',
      isRead: randBool(0.4),
      createdAt: enrolledAt,
    });

    courseContext.assignments.forEach((assignmentEntry) => {
      const assignment = assignmentEntry.model;
      const createdAt = new Date(Math.max(enrolledAt.getTime(), assignmentEntry.postedAt.getTime()));
      notifications.push({
        userId: enrollment.studentId,
        title: 'New assignment posted',
        message: `New Assignment: ${assignment.title} has been posted in ${courseContext.course.title}. Due: ${formatDate(assignment.dueDate)}.`,
        type: 'deadline',
        isRead: randBool(0.4),
        createdAt,
      });
    });
  });

  submissionEvents
    .filter((event) => event.status === 'graded' && event.submission)
    .forEach((event) => {
      const teacherName = `${event.teacher.firstName} ${event.teacher.lastName}`;
      notifications.push({
        userId: event.studentId,
        title: 'Assignment graded',
        message: `${teacherName} has graded your assignment '${event.assignment.title}': ${event.score}/${event.assignment.maxScore}. Assignment graded: ${event.score}/${event.assignment.maxScore}`,
        type: 'grade',
        isRead: randBool(0.4),
        createdAt: event.gradedAt || event.submittedAt,
      });
    });

  quizAttemptEvents.forEach((event) => {
    notifications.push({
      userId: event.studentId,
      title: 'Quiz completed',
      message: `Quiz completed! You scored ${event.score}% on '${event.quiz.title}' in ${event.course.title}.`,
      type: 'grade',
      isRead: randBool(0.4),
      createdAt: event.completedAt,
    });
  });

  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications, { validate: true });
  }

  return notifications.length;
};

const clearSeedData = async () => {
  console.log('🧹 Clearing old seed data...');
  await Notification.destroy({ where: {} });
  await QuizAttempt.destroy({ where: {} });
  await Question.destroy({ where: {} });
  await Quiz.destroy({ where: {} });
  await Submission.destroy({ where: {} });
  await Assignment.destroy({ where: {} });
  await LessonProgress.destroy({ where: {} });
  await Enrollment.destroy({ where: {} });
  await Material.destroy({ where: {} });
  await Lesson.destroy({ where: {} });
  await Section.destroy({ where: {} });
  await Course.destroy({ where: {} });
  await User.destroy({ where: {} });
};

const logVerificationCounts = async () => {
  const [
    users,
    courses,
    sections,
    lessons,
    assignments,
    quizzes,
    questions,
    enrollments,
    submissions,
    gradedSubmissions,
    quizAttempts,
    lessonProgress,
    notifications,
  ] = await Promise.all([
    User.count(),
    Course.count(),
    Section.count(),
    Lesson.count(),
    Assignment.count(),
    Quiz.count(),
    Question.count(),
    Enrollment.count(),
    Submission.count(),
    Submission.count({ where: { status: 'graded' } }),
    QuizAttempt.count(),
    LessonProgress.count(),
    Notification.count(),
  ]);

  console.log('---');
  console.log(`✓ Users:             ${users}`);
  console.log(`✓ Courses:           ${courses}`);
  console.log(`✓ Sections:          ${sections}`);
  console.log(`✓ Lessons:           ${lessons}`);
  console.log(`✓ Assignments:       ${assignments}`);
  console.log(`✓ Quizzes:           ${quizzes}`);
  console.log(`✓ Questions:         ${questions}`);
  console.log(`✓ Enrollments:       ${enrollments}`);
  console.log(`✓ Submissions:       ${submissions}`);
  console.log(`✓ Graded:            ${gradedSubmissions}`);
  console.log(`✓ Quiz Attempts:     ${quizAttempts}`);
  console.log(`✓ LessonProgress:    ${lessonProgress}`);
  console.log(`✓ Notifications:     ${notifications}`);
};

const seed = async () => {
  console.log('🌱 Starting seeder...');

  sequelize.options.logging = false;
  await sequelize.sync({ force: false });
  await clearSeedData();

  const { admin, teachers, students } = await createUsers();
  const teacherByEmail = new Map(teachers.map((teacher) => [teacher.email, teacher]));

  const courseContexts = await createCourses(teacherByEmail);
  const enrollments = await createEnrollments(courseContexts, students);
  await createLessonProgress(courseContexts, enrollments);
  const submissionEvents = await createSubmissions(courseContexts, enrollments);
  const quizAttemptEvents = await createQuizAttempts(courseContexts, enrollments);
  await createNotifications(courseContexts, enrollments, submissionEvents, quizAttemptEvents);

  console.log('✨ Seeding complete!');
  await logVerificationCounts();
  console.log('---');
  console.log('Login credentials:');
  console.log(`  Admin:   ${admin.email} / Admin123!`);
  console.log('  Teacher: james.wilson@eduflow.com / Teacher123!');
  console.log('  Student: liam.harris@student.edu / Student123!');
};

if (require.main === module) {
  seed()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seeder failed:', err);
      try {
        await sequelize.close();
      } catch (_closeError) {
        // ignore close errors during failure path
      }
      process.exit(1);
    });
}

module.exports = seed;
