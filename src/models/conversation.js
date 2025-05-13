const conversationStates = new Map();
const IDLE_TIMEOUT = 2 * 60 * 1000; // 5 minutes in milliseconds

const getConversationState = (userId) => {
  return conversationStates.get(userId) || { state: 'initial' };
};

const setConversationState = (userId, state) => {
  conversationStates.set(userId, {
    ...state,
    lastActiveTime: Date.now()
  });
};
const removeIdleUsers = () => {
  const now = Date.now();
  conversationStates.forEach((state, userId) => {
    if (now - (state.lastActiveTime || 0) > IDLE_TIMEOUT) {
      conversationStates.delete(userId);
    }
  });
};

module.exports = {
  conversationStates,
  getConversationState,
  setConversationState,
  removeIdleUsers,
  IDLE_TIMEOUT
};