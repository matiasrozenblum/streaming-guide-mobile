# Signup Flow Spec: Keyboard & Data Handling

## Overview
Address critical UX issues in the signup process: keyboard obstructing inputs, broken date picker interactions, and incorrect gender data submission.

## 1. Keyboard Handling (LoginModal)
### Current Issue
- The `LoginModal` does not resize or adjust its content when the keyboard appears.
- The "Continue" button is hidden behind the keyboard.
- Inputs near the bottom of the screen become unreachable.

### Proposed Fix
- **File:** `src/components/LoginModal.tsx`
- **Component:** Wrap the `LoginModal` content (specifically the `Steps` container) in a `KeyboardAvoidingView` or `KeyboardAwareScrollView` (if available, or standard `ScrollView` with `contentContainerStyle`).
- **Platform Specific:**
  - **iOS:** Use `behavior="padding"` or `"position"` with proper offset.
  - **Android:** Ensure `windowSoftInputMode` is set correctly in `AndroidManifest.xml` (or rely on `KeyboardAvoidingView` with `behavior="height"`).
- **Implementation:**
  ```tsx
  <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} // Adjust based on header height
  >
      <ScrollView ...>
          {stepComponent}
      </ScrollView>
  </KeyboardAvoidingView>
  ```

## 2. Date Picker (ProfileStep)
### Current Issue
- Opening the date picker does not dismiss the keyboard.
- The picker (native or modal) conflicts with the keyboard layout.
- Dismissing the keyboard shifts layout, potentially hiding the "Continue" button.

### Proposed Fix
- **File:** `src/components/auth/steps/ProfileStep.tsx`
- **Action:** Before showing the date picker (`setShowDatePicker(true)`), force keyboard dismissal: `Keyboard.dismiss()`.
- **Logic:** Add `Keyboard.dismiss()` call inside `onPress` for the date input.
- **Wait:** Ensure the keyboard is fully dismissed before showing the picker (add a small timeout if necessary, e.g., 100ms).

## 3. Gender Selection (Data Mapping)
### Current Issue
- The UI displays localized labels (`Masculino`, `Femenino`, etc.).
- The backend (V2 API) expects specific enum values (`male`, `female`, `non_binary`, `rather_not_say`).
- **Observation:** Currently, `setGender` stores localized strings directly from `Menu.Item`.

### Proposed Fix
- **File:** `src/components/auth/steps/ProfileStep.tsx`
- **Implementation:**
  - Create a mapping object:
    ```ts
    const GENDER_MAP = {
        'Masculino': 'male',
        'Femenino': 'female',
        'No binario': 'non_binary',
        'Prefiero no decir': 'rather_not_say'
    };
    ```
  - Store the *backend value* in state (`gender`), but display the *label* in the button text.
  - Alternatively, keep storing labels but map them only on submit. **Better:** Store backend values (`male`, etc.) and map to labels for display.
  - **Update Menu Items:**
    ```tsx
    <Menu.Item onPress={() => setGender('male')} title="Masculino" />
    <Menu.Item onPress={() => setGender('female')} title="Femenino" />
    // ...
    ```
  - **Display Logic:**
    ```tsx
    <Text>{GENDER_LABELS[gender] || 'Género'}</Text>
    ```

## 4. Submission Validation
- Verify the payload sent to `authApi.register` matches the V2 spec exactly.
- Confirm `birthDate` format is `YYYY-MM-DD` (already handled in `LoginModal.tsx`, but double-check).
- Ensure `gender` is one of the allowed enum strings.

## Expected Outcome
- **Smooth Flow:** User taps date input -> Keyboard closes -> Date picker opens -> User selects date -> Picker closes -> Layout stable.
- **Visibility:** "Continue" button is always reachable (via scroll if needed) even with keyboard open.
- **Data Integrity:** Registration succeeds with correct gender and birthdate formats.
