# White-Labeling & Multi-Use Reference

> Notes from conversation about making this repo reusable for others and different industries

## Date
January 2026

---

## Key Findings: How Explicit is "Michael Aldama"?

Found **66+ references** to "Michael" or "MichaelLLM" across the codebase:

### High-Priority Changes (Must Update for White-Label):
1. `prompts/system.md` - Line 3: `"MichaelLLM", a friendly chat assistant on Michael Aldama's portfolio`
2. `prompts/knowledge.md` - Title: `# Michael Aldama - Knowledge Base`
3. `api/chat.js` - Line 112: `"MichaelLLM", a friendly assistant embedded on Michael Aldama's portfolio website`
4. `api/chat.js` - Line 16: Comment mentions `michaelaldama.com`
5. `test.html` - Line 130: `MICHAEL ALDAMA | PRODUCT DESIGNER`

### Medium-Priority (Branding/Function Names):
- Function names: `toggleMichaelLLM()`, `openMichaelLLM()`, `closeMichaelLLM()`
- CSS classes: All `mllm-*` prefixed
- Widget title: `MICHAEL.LLM`
- Welcome message: `"Hey there, I'm MichaelLLM."`
- Placeholder: `"Ask about Michael..."`
- README mentions throughout

### Low-Priority (Examples/Documentation):
- FAQ.md examples
- README examples
- Comments in code

---

## White-Labeling Strategy

### Option 1: Configuration File (Recommended for Future)
Create a single `config.json` that drives all branding:
- Bot name
- Person name
- Website type
- Domain
- Colors

### Option 2: Find & Replace Checklist
Manual replacement in:
1. `prompts/system.md`
2. `prompts/knowledge.md`
3. `api/chat.js`
4. `widget/embed.html`
5. `test.html`
6. `README.md`
7. `package.json`
8. `api/chat.js` - ALLOWED_ORIGINS

---

## Adapting for Other Industries

The structure works for portfolios but can be adapted for:

1. **E-commerce Customer Support**
   - Focus: Product questions, shipping, returns
   - Knowledge base: Product catalog, policies
   - Seed prompts: "What's your return policy?", "How long is shipping?"

2. **SaaS Onboarding Assistant**
   - Focus: Feature explanations, setup help
   - Knowledge base: Product features, documentation links
   - Seed prompts: "How do I get started?", "What features are available?"

3. **Consulting/Freelance Services**
   - Similar to portfolio but emphasize services, process, pricing
   - Knowledge base: Service offerings, case studies, pricing tiers

4. **Non-Profit/Advocacy**
   - Mission-focused, donation info, volunteer opportunities
   - Knowledge base: Mission statement, impact stories

5. **Educational Content**
   - Teaching assistant, course information
   - Knowledge base: Course content, FAQs, resources

---

## Git Workflow: Preserving Personal Version

### Safe Approach: Git Branches

**Step 1: Create Backup Branch**
# Make sure everything is committed
git status

# Create backup of personalized version
git checkout -b michael-personal
git push -u origin michael-personal
