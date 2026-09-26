import React,{useCallback,useEffect,useState}from'react';
import{ScrollView,StyleSheet,View}from'react-native';
import{AppCard}from'../../components/ui/AppCard';
import{AppText}from'../../components/ui/AppText';
import{ErrorState}from'../../components/ui/ErrorState';
import{LoadingState}from'../../components/ui/LoadingState';
import{Screen}from'../../components/ui/Screen';
import{getWorkoApiErrorMessage}from'../../api/apiClient';
import{workerApi}from'../../worker/workerApi';
import type{WorkerProfile}from'../../worker/types';
import{useAuthStore}from'../../store/authStore';
import{useTheme}from'../../theme/ThemeProvider';
import{WorkerOnboardingScreen}from'./WorkerOnboardingScreen';

const statusLabel=(s:WorkerProfile['status']):string=>({DRAFT:'Profile setup',PENDING_KYC:'KYC pending',KYC_SUBMITTED:'KYC submitted',UNDER_REVIEW:'Under review',VERIFIED:'Verified',REJECTED:'Changes required',SUSPENDED:'Suspended',BLOCKED:'Blocked'}[s]);

export const WorkerHomeScreen=():React.JSX.Element=>{
 const user=useAuthStore(s=>s.user);const{theme}=useTheme();
 const[profile,setProfile]=useState<WorkerProfile|null>(null);const[loading,setLoading]=useState(true);const[missing,setMissing]=useState(false);const[error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{
  setLoading(true);setError(null);
  try{setProfile(await workerApi.getMyProfile());setMissing(false);}
  catch(err){const msg=getWorkoApiErrorMessage(err);if(msg.toLowerCase().includes('not found')){setMissing(true);setProfile(null);}else setError(msg);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 if(loading)return <Screen><LoadingState message="Loading your worker workspace..." /></Screen>;
 if(missing)return <WorkerOnboardingScreen onComplete={p=>{setProfile(p);setMissing(false);}}/>;
 if(error)return <Screen><ErrorState title="Could not load worker profile" description={error} onActionPress={()=>void load()}/></Screen>;
 if(!profile)return <Screen><ErrorState title="Worker profile unavailable" onActionPress={()=>void load()}/></Screen>;
 return <Screen padded={false}><ScrollView contentContainerStyle={styles.content}>
  <AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>WORKER</AppText>
  <AppText variant="display">Hi, {user?.firstName??'there'} 👋</AppText>
  <AppText variant="body" muted>Manage your profile and stay ready for relevant work.</AppText>
  <AppCard elevated><AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>PROFILE STATUS</AppText><AppText variant="title" style={styles.title}>{statusLabel(profile.status)}</AppText><AppText variant="body" muted>{profile.status==='VERIFIED'?'Your profile is verified and can receive relevant work.':'Complete the remaining onboarding requirements before KYC submission.'}</AppText></AppCard>
  <View style={styles.row}><View style={[styles.summary,{backgroundColor:theme.colors.surface,borderColor:theme.colors.border}]}><AppText variant="display">{profile.categories.length}</AppText><AppText variant="caption" muted>Categories</AppText></View><View style={[styles.summary,{backgroundColor:theme.colors.surface,borderColor:theme.colors.border}]}><AppText variant="display">{profile.skills.length}</AppText><AppText variant="caption" muted>Skills</AppText></View></View>
  <AppCard><AppText variant="title">Availability</AppText><AppText variant="body" muted style={styles.next}>{profile.isAvailable?'You are marked available for matching.':'You are currently unavailable for matching.'}</AppText></AppCard>
 </ScrollView></Screen>;
};
const styles=StyleSheet.create({content:{padding:20,paddingBottom:32,gap:20},title:{marginTop:8,marginBottom:6},row:{flexDirection:'row',gap:12},summary:{flex:1,minHeight:96,borderWidth:1,borderRadius:18,padding:16,justifyContent:'space-between'},next:{marginTop:8}});
