/**
 * Minimal verification: no_topic → openers, in_project → chainers.
 * Run from repo root: node scripts/verify-followups.js
 */
import { classifyConversationState, selectFollowups, OPENERS, CHAINERS, LOOPERS } from '../api/chat.js';

const setOf = (arr) => new Set(arr);

const OPENER_SET = setOf(OPENERS);
const CHAINER_SET = setOf(CHAINERS);
const LOOPER_SET = setOf(LOOPERS);

function allIn(set, items) {
  return items.every((item) => set.has(item));
}

let passed = 0;
let failed = 0;

function ok(condition, name) {
  if (condition) {
    passed++;
    console.log('  ok:', name);
  } else {
    failed++;
    console.log('  FAIL:', name);
  }
}

console.log('Verify: no_topic → openers; in_project → chainers\n');

// No topic: steering reply → openers
const replySteering = "I'm here to help! Anything you'd like to know about his projects?";
const followupsNoTopic = selectFollowups(replySteering, [], "what's your favorite color?", null);
ok(classifyConversationState([], "what's your favorite color?", replySteering) === 'no_topic', 'state is no_topic when reply has steering');
ok(followupsNoTopic.length === 3, 'no_topic returns 3 follow-ups');
ok(allIn(OPENER_SET, followupsNoTopic), 'no_topic returns only openers');

// In project: reply mentions project → chainers
const replyProject = "That project was the onboarding redesign. We reduced time from 17 to 7 days.";
const followupsProject = selectFollowups(replyProject, [], "tell me about the onboarding project", null);
ok(classifyConversationState([], "tell me about the onboarding project", replyProject) === 'in_project', 'state is in_project when reply has project');
ok(allIn(CHAINER_SET, followupsProject), 'in_project returns only chainers');

// In project: user message mentions project, reply generic
const replyShort = "Sure, happy to share more.";
const historyWithProject = [{ role: 'user', content: 'Tell me about the delivery solution' }, { role: 'assistant', content: 'We built...' }];
ok(classifyConversationState(historyWithProject, "what was the outcome?", replyShort) === 'in_project', 'state is in_project when last user message had project');
const followupsInProject = selectFollowups(replyShort, historyWithProject, "what was the outcome?", null);
ok(allIn(CHAINER_SET, followupsInProject), 'in_project (history) returns only chainers');

// Wrapping: long history, no project in reply/message
const longHistory = [
  { role: 'user', content: 'Tell me about onboarding' },
  { role: 'assistant', content: 'That project reduced time from 17 to 7 days.' },
  { role: 'user', content: 'What was the outcome?' },
  { role: 'assistant', content: 'We cut internal setup from ~40 hours to minutes.' }
];
const stateWrap = classifyConversationState(longHistory, "thanks!", "Glad that helped!");
ok(stateWrap === 'wrapping', 'state is wrapping when history long and no project in last exchange');
const followupsWrap = selectFollowups("Glad that helped!", longHistory, "thanks!", null);
ok(followupsWrap.length === 3, 'wrapping returns 3 follow-ups');
const fromLoopersOrOpeners = (s) => LOOPER_SET.has(s) || OPENER_SET.has(s);
ok(followupsWrap.every(fromLoopersOrOpeners), 'wrapping returns only loopers or openers');

// "Tell me more about that" and "What's next?" not in openers
ok(!OPENER_SET.has("Tell me more about that."), '"Tell me more about that" is not an opener');
ok(!CHAINERS.includes("What's next?"), '"What\'s next?" is excluded from chainers');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
