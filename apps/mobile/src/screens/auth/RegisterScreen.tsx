import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
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
import type {RegisterInput, UserRole} from '../../auth/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Role = Extract<UserRole, 'CLIENT' | 'WORKER'>;
const roleInfo: Record<Role, {label:string; subtitle:string; mark:string}> = {
  CLIENT: {label:'I need work', subtitle:'Post requirements and hire', mark:'C'},
  WORKER: {label:'I do work', subtitle:'Find jobs and showcase skills', mark:'W'},
};

export const RegisterScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme}=useTheme(); const {show}=useToast();
  const register=useAuthStore(state=>state.register); const serverError=useAuthStore(state=>state.error); const clearError=useAuthStore(state=>state.clearError);
  const [firstName,setFirstName]=useState(''); const [lastName,setLastName]=useState(''); const [email,setEmail]=useState(''); const [phoneNumber,setPhoneNumber]=useState(''); const [role,setRole]=useState<Role>('CLIENT'); const [loading,setLoading]=useState(false);
  const opacity=useRef(new Animated.Value(0)).current; const translateY=useRef(new Animated.Value(16)).current;
  useEffect(()=>{Animated.parallel([Animated.timing(opacity,{toValue:1,duration:350,easing:Easing.out(Easing.ease),useNativeDriver:true}),Animated.spring(translateY,{toValue:0,useNativeDriver:true,damping:16,stiffness:150})]).start();},[opacity,translateY]);

  const submit=async():Promise<void>=>{
    const normalizedEmail=email.trim().toLowerCase(); const normalizedPhone=phoneNumber.replace(/\D/g,''); const normalizedFirstName=firstName.trim();
    if(!normalizedFirstName){show('Enter your first name.','error');return;}
    if(!lastName.trim()){show('Enter your last name.','error');return;}
    if(!emailPattern.test(normalizedEmail)){show('Enter a valid email address.','error');return;}
    if(normalizedPhone.length!==10){show('Enter a valid 10-digit mobile number.','error');return;}
    clearError(); setLoading(true);
    const input:RegisterInput={firstName:normalizedFirstName,lastName:lastName.trim(),email:normalizedEmail,phoneNumber:normalizedPhone,role};
    const response=await register(input); setLoading(false);
    if(response){show('Account created. OTP sent to your email.','success');navigation.navigate('VerifyOtp',{identifier:normalizedEmail,purpose:'REGISTRATION',channel:'EMAIL'});}
    else show(useAuthStore.getState().error??'Unable to create account. Please try again.','error');
  };

  return <Screen padded={false}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll,{paddingHorizontal:theme.spacing.lg}]}>
      <Animated.View style={[styles.container,{opacity,transform:[{translateY}]}]}>
        <AppButton label="Back" variant="ghost" disabled={loading} onPress={()=>navigation.goBack()} />
        <View style={styles.inner}>
          <AuthHeader eyebrow="Join Worko" title="Create your account" description="Tell us how you’ll use Worko so we can shape the experience around you." />
          <View style={[styles.form,{opacity:loading?0.58:1}]} pointerEvents={loading?'none':'auto'}>
            <View style={styles.section}><AppText variant="caption" muted style={styles.sectionLabel}>ACCOUNT TYPE</AppText>
              <View style={styles.roleRow}>{(['CLIENT','WORKER'] as const).map(item=>{const selected=role===item;const info=roleInfo[item];return <Pressable key={item} onPress={()=>setRole(item)} style={[styles.roleCard,{backgroundColor:selected?theme.colors.accent:theme.colors.surface,borderColor:selected?theme.colors.accent:theme.colors.border}]}>
                <View style={[styles.roleMark,{backgroundColor:selected?theme.colors.inverse:theme.colors.background}]}><AppText style={{color:selected?theme.colors.accent:theme.colors.textPrimary,fontWeight:'900'}}>{info.mark}</AppText></View>
                <View style={styles.roleCopy}><AppText style={{color:selected?theme.colors.inverse:theme.colors.textPrimary,fontWeight:'800'}}>{info.label}</AppText><AppText variant="caption" style={{color:selected?theme.colors.inverse:theme.colors.textSecondary}}>{info.subtitle}</AppText></View>
                <View style={[styles.radio,{borderColor:selected?theme.colors.inverse:theme.colors.border}]}>{selected?<View style={[styles.radioDot,{backgroundColor:theme.colors.inverse}]}/>:null}</View>
              </Pressable>;})}</View>
            </View>
            <View style={styles.section}><AppText variant="caption" muted style={styles.sectionLabel}>YOUR DETAILS</AppText>
              <AppInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="Your first name" autoCapitalize="words" editable={!loading}/>
              <AppInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Your last name" autoCapitalize="words" editable={!loading}/>
              <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading}/>
              <AppInput label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} editable={!loading}/>
            </View>
            {serverError?<AppText variant="caption" style={{color:theme.colors.danger}}>{serverError}</AppText>:null}
            <AppButton label="Create account" loading={loading} disabled={loading} onPress={submit}/>
            <AppText variant="caption" muted style={styles.switchText}>Already have an account? <AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'700'}} onPress={()=>!loading&&navigation.navigate('Login')}>Sign in</AppText></AppText>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  </KeyboardAvoidingView></Screen>;
};

const styles=StyleSheet.create({flex:{flex:1},scroll:{paddingTop:8,paddingBottom:32},container:{width:'100%',maxWidth:520,alignSelf:'center'},inner:{width:'100%',maxWidth:420,alignSelf:'center',marginTop:12},form:{gap:16,marginTop:28},section:{gap:12},sectionLabel:{fontWeight:'800',letterSpacing:1},roleRow:{gap:10},roleCard:{minHeight:82,borderWidth:1,borderRadius:18,padding:12,flexDirection:'row',alignItems:'center',gap:12},roleMark:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},roleCopy:{flex:1,gap:3},radio:{width:20,height:20,borderRadius:10,borderWidth:1.5,alignItems:'center',justifyContent:'center'},radioDot:{width:10,height:10,borderRadius:5},switchText:{textAlign:'center'}});
