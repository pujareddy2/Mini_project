import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import ROUTES from '../navigation/routes';
import { loginUser } from '../services/authService';
import ScreenLayout from '../components/ScreenLayout';
import { SPACING } from '../theme';
import getDeviceInfo from '../utils/deviceInfo';
import STORAGE_KEYS from '../utils/storageKeys';

const ADMISSION_TYPE_OPTIONS = ['EAMCET', 'JEE', 'Management', 'NRI', 'Lateral Entry', 'Other'];
const COURSE_OPTIONS = ['B.Tech', 'B.E', 'M.Tech', 'Diploma'];
const BRANCH_OPTIONS = {
  'B.Tech': ['CSE', 'AI & ML', 'ECE', 'EEE', 'Mechanical', 'Civil'],
  'B.E': ['CSE', 'ECE', 'Mechanical', 'Civil'],
  'M.Tech': ['CSE', 'Data Science', 'VLSI'],
  Diploma: ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil'],
};

function formatDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  return dateValue.toLocaleDateString('en-GB');
}

function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [phone, setPhone] = useState('');
  const [admissionType, setAdmissionType] = useState(ADMISSION_TYPE_OPTIONS[0]);
  const [otherAdmissionType, setOtherAdmissionType] = useState('');
  const [admissionScore, setAdmissionScore] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [course, setCourse] = useState(COURSE_OPTIONS[0]);
  const [branch, setBranch] = useState(BRANCH_OPTIONS[COURSE_OPTIONS[0]][0]);
  const [profilePhotoUri, setProfilePhotoUri] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const registerAnim = useRef(new Animated.Value(0)).current;

  const showAdmissionScore = admissionType === 'EAMCET' || admissionType === 'JEE';
  const showOtherAdmissionField = admissionType === 'Other';
  const branchOptions = useMemo(() => BRANCH_OPTIONS[course] || ['General'], [course]);

  useEffect(() => {
    Animated.timing(registerAnim, {
      toValue: mode === 'register' ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [mode, registerAnim]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email or roll number and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const deviceInfo = await getDeviceInfo();
      const response = await loginUser(email, password, deviceInfo);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, response.token],
        [STORAGE_KEYS.USER_ID, response.userID],
        [STORAGE_KEYS.DEVICE_INFO, JSON.stringify(deviceInfo)],
      ]);

      navigation.replace(ROUTES.HOME);
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePickPhoto() {
    try {
      setIsUploadingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Profile photo access is required to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch {
      setErrorMessage('Unable to access photo library on this device.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleRegister() {
    const effectiveAdmissionType = showOtherAdmissionField ? otherAdmissionType.trim() : admissionType.trim();

    if (
      !name.trim()
      || !email.trim()
      || !rollNo.trim()
      || !password.trim()
      || !effectiveAdmissionType
      || !formatDate(admissionDate).trim()
      || !course.trim()
      || !branch.trim()
    ) {
      setErrorMessage('Please complete all required registration fields.');
      return;
    }

    if (showAdmissionScore && !admissionScore.trim()) {
      setErrorMessage('Admission score is required for EAMCET and JEE admissions.');
      return;
    }

    try {
      setIsLoading(true);
      const studentProfile = {
        name: name.trim(),
        email: email.trim(),
        rollNumber: rollNo.trim(),
        password: password.trim(),
        admissionType: effectiveAdmissionType,
        admissionScore: showAdmissionScore ? admissionScore.trim() : '',
        admissionDate: formatDate(admissionDate),
        course,
        branch,
        phone: phone.trim(),
        profilePhotoUri,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_STUDENT, JSON.stringify(studentProfile));
      setErrorMessage('Registration saved. Use these credentials to log in.');
      setMode('login');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  }

  function fieldStyle(fieldKey) {
    return [styles.input, focusedField === fieldKey && styles.inputFocused];
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Verimark" subtitle="Student onboarding" />

      <View style={styles.formStack}>
        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>{mode === 'login' ? 'Welcome back' : 'Create your profile'}</Text>
          <Text style={styles.screenSubtitle}>Securely verify attendance with smart classroom checks.</Text>
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => {
              setMode('login');
              setErrorMessage('');
            }}
            style={[styles.toggleButton, mode === 'login' && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('register');
              setErrorMessage('');
            }}
            style={[styles.toggleButton, mode === 'register' && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Register</Text>
          </Pressable>
        </View>

        {mode === 'login' ? (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Email or Roll Number</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="student@test.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={fieldStyle('loginEmail')}
                onFocus={() => setFocusedField('loginEmail')}
                onBlur={() => setFocusedField('')}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                style={fieldStyle('loginPassword')}
                onFocus={() => setFocusedField('loginPassword')}
                onBlur={() => setFocusedField('')}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <AppButton label="Access Dashboard" onPress={handleLogin} loading={isLoading} style={styles.mainButton} />
          </>
        ) : (
          <Animated.View style={{ opacity: registerAnim, transform: [{ translateY: registerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
            <View style={styles.registerStack}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  style={fieldStyle('name')}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField('')}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@test.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={fieldStyle('email')}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Roll Number</Text>
                <TextInput
                  value={rollNo}
                  onChangeText={setRollNo}
                  placeholder="12345"
                  style={fieldStyle('rollNo')}
                  onFocus={() => setFocusedField('rollNo')}
                  onBlur={() => setFocusedField('')}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create password"
                  secureTextEntry
                  style={fieldStyle('password')}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Admission Type</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={admissionType} onValueChange={(value) => setAdmissionType(value)}>
                    {ADMISSION_TYPE_OPTIONS.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              {showOtherAdmissionField ? (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Other Admission Type</Text>
                  <TextInput
                    value={otherAdmissionType}
                    onChangeText={setOtherAdmissionType}
                    placeholder="Describe admission type"
                    style={fieldStyle('otherAdmissionType')}
                    onFocus={() => setFocusedField('otherAdmissionType')}
                    onBlur={() => setFocusedField('')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              ) : null}

              {showAdmissionScore ? (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Admission Score</Text>
                  <TextInput
                    value={admissionScore}
                    onChangeText={setAdmissionScore}
                    placeholder="Enter score"
                    keyboardType="numeric"
                    style={fieldStyle('admissionScore')}
                    onFocus={() => setFocusedField('admissionScore')}
                    onBlur={() => setFocusedField('')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Admission Date</Text>
                <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                  <Text style={styles.dateButtonText}>{formatDate(admissionDate) || 'Select admission date'}</Text>
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={admissionDate}
                    mode="date"
                    display="default"
                    onChange={(_, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setAdmissionDate(selectedDate);
                      }
                    }}
                  />
                ) : null}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Course</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={course}
                    onValueChange={(value) => {
                      setCourse(value);
                      setBranch((BRANCH_OPTIONS[value] || ['General'])[0]);
                    }}
                  >
                    {COURSE_OPTIONS.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Branch</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={branch} onValueChange={setBranch}>
                    {branchOptions.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Phone Number (optional)</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  style={fieldStyle('phone')}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField('')}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Profile Photo (optional)</Text>
                <AppButton
                  label={isUploadingPhoto ? 'Uploading...' : 'Upload Profile Photo'}
                  onPress={handlePickPhoto}
                  loading={isUploadingPhoto}
                  variant="secondary"
                />
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} />
                ) : null}
              </View>

              <AppButton label="Create Student Account" onPress={handleRegister} loading={isLoading} style={styles.mainButton} />
            </View>
          </Animated.View>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    paddingBottom: SPACING.lg,
  },
  formStack: {
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    gap: 12,
    padding: 16,
    width: '100%',
  },
  titleBlock: {
    gap: 4,
    marginBottom: 2,
  },
  mainTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '600',
  },
  screenSubtitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleRow: {
    alignSelf: 'stretch',
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 4,
    padding: 4,
    width: '100%',
  },
  toggleButton: {
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
  },
  toggleText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  registerStack: {
    gap: 12,
    marginTop: 8,
  },
  fieldBlock: {
    alignSelf: 'stretch',
    gap: 6,
    width: '100%',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  pickerWrap: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dateButton: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  profilePhoto: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    height: 88,
    marginTop: 8,
    width: 88,
  },
  mainButton: {
    marginTop: 4,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default LoginScreen;
