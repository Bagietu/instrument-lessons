// Little words of encouragement, picked at random.

const STEP_CHEERS = ['Nice one!', 'You nailed it!', 'Sounding great!', 'Way to go!', 'Smooth!', 'Keep it up!', 'Boom! 💥', 'That’s the spirit!']
const LESSON_CHEERS = ['You’re a star! ⭐', 'Lesson crushed!', 'Rock on! 🤘', 'Bravo!', 'Encore! 👏']

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

export const stepCheer = () => pick(STEP_CHEERS)
export const lessonCheer = () => pick(LESSON_CHEERS)
