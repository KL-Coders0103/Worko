import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {AppInput} from '../../components/ui/AppInput';
import {AuthHeader} from '../../components/ui/AuthHeader';
import {useTheme} from '../../theme/ThemeProvider';
import {useToast} from '../../components/ui/ToastProvider';
import {useAuthStore} from '../../store/authStore';
import type {AuthStackParamList} from '../../navigation/types';
import type {OtpChannel} from '../../auth/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type ChannelChoice = 'EMAIL' | 'SMS';
const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export const LoginScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme(); const {show} = useToast();
  const sendOtp = useAuthStore(state => state.sendOtp); const serverError = useAuthStore(state => state.error); const clearError = useAuthStore(state => state.clearError);
  const [channel, setChannel] = useState<ChannelChoice>('EMAIL'); const [identifier, setIdentifier] = useState(''); const [loading, setLoading] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current; const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => { Animated.parallel([Animated.timing(opacity,{toValue:1,duration:350,easing:Easing.out(Easing.ease),useNativeDriver:true}),Animated.spring(translateY,{toValue:0,useNativeDriver:true,damping:16,stiffness:150})]).start(); }, [opacity,translateY]);

  const choose = (next: ChannelChoice): void => { setChannel(next); setIdentifier(''); clearError(); };
  const submit = async (): Promise<void> => {
    const value = channel === 'EMAIL' ? identifier.trim().toLowerCase() : identifier.replace(/\\D/g, '');
    const valid = channel === 'EMAIL' ? emailPattern.test(value) : value.length === 10;
    if (!valid) { show(channel === 'EMAIL' ? 'Enter a valid email address.' : 'Enter a valid 10-digit mobile number.', 'error'); return; }
    clearError(); setLoading(true);
    const otpChannel: OtpChannel = channel === 'EMAIL' ? 'EMAIL' : 'SMS';
    const success = await sendOtp({identifier: value, purpose: 'LOGIN', channel: otpChannel}); setLoading(false);
    if (success) { show('OTP sent successfully.', 'success'); navigation.navigate('VerifyOtp', {identifier:value,purpose:'LOGIN',channel:otpChannel}); }
    else show(useAuthStore.getState().error ?? 'Unable to send OTP. Please try again.', 'error');
  };

  return <Screen padded={false}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Animated.View style={[styles.container,{opacity,transform:[{translateY}]}]}>
      <AppButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      <View style={styles.inner}>
        <AuthHeader eyebrow="Welcome back" title="Sign in to Worko" description="Choose where you want your one-time password sent." />
        <View style={styles.form}>
          <View style={styles.choiceRow}>
            {(['EMAIL','SMS'] as const).map(item => { const selected=channel===item; return <Pressable key={item} disabled={loading} onPress={() => choose(item)} style={[styles.choice,{backgroundColor:selected?theme.colors.accent:theme.colors.surface,borderColor:selected?theme.colors.accent:theme.colors.border,opacity:loading?0.55:1}]}>
              <View style={[styles.choiceIcon,{backgroundColor:selected?theme.colors.inverse:theme.colors.background}]}><AppText style={{color:selected?theme.colors.accent:theme.colors.textPrimary,fontWeight:'900'}}>{item==='EMAIL'?'@':'M'}</AppText></View>
              <View style={styles.choiceCopy}><AppText style={{color:selected?theme.colors.inverse:theme.colors.textPrimary,fontWeight:'800'}}>{item==='EMAIL'?'Email':'Mobile'}</AppText><AppText variant="caption" style={{color:selected?theme.colors.inverse:theme.colors.textSecondary}}>{item==='EMAIL'?'Use your email':'Use your phone'}</AppText></View>
              <View style={[styles.radio,{borderColor:selected?theme.colors.inverse:theme.colors.border}]}>{selected?<View style={[styles.radioDot,{backgroundColor:theme.colors.inverse}]} />:null}</View>
            </Pressable>; })}
          </View>
          <AppInput label={channel==='EMAIL'?'Email address':'Mobile number'} value={identifier} onChangeText={setIdentifier} placeholder={channel==='EMAIL'?'you@example.com':'9876543210'} keyboardType={channel==='EMAIL'?'email-address':'phone-pad'} autoCapitalize="none" autoCorrect={false} maxLength={channel==='SMS'?10:undefined} editable={!loading} />
          {serverError ? <AppText variant="caption" style={{color:theme.colors.danger}}>{serverError}</AppText> : null}
          <AppButton label="Send OTP" loading={loading} disabled={!identifier.trim()} onPress={submit} />
          <View style={styles.divider}><View style={[styles.line,{backgroundColor:theme.colors.border}]} /><AppText variant="caption" muted>or</AppText><View style={[styles.line,{backgroundColor:theme.colors.border}]} /></View>
          <AppButton label="Continue with Google" variant="secondary" onPress={() => show('Google sign-in will be enabled in the authentication phase.','info')} />
          <AppText variant="caption" muted style={styles.switchText}>New to Worko? <AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'700'}} onPress={() => navigation.navigate('Register')}>Create account</AppText></AppText>
        </View>
      </View>
    </Animated.View>
  </KeyboardAvoidingView></Screen>;
};

const styles=StyleSheet.create({flex:{flex:1},container:{flex:1,width:'100%',maxWidth:520,alignSelf:'center',paddingHorizontal:20,paddingTop:8},inner:{width:'100%',maxWidth:420,alignSelf:'center',marginTop:12},form:{gap:16,marginTop:30},choiceRow:{gap:10},choice:{minHeight:72,borderWidth:1,borderRadius:18,padding:12,flexDirection:'row',alignItems:'center',gap:12},choiceIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},choiceCopy:{flex:1,gap:2},radio:{width:20,height:20,borderRadius:10,borderWidth:1.5,alignItems:'center',justifyContent:'center'},radioDot:{width:10,height:10,borderRadius:5},divider:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:4},line:{height:1,flex:1},switchText:{textAlign:'center'}});
