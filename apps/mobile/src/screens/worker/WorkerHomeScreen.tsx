import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Alert,RefreshControl,ScrollView,StyleSheet,View}from'react-native';
import{AppButton,AppCard,AppText,ErrorState,LoadingState,Screen}from'../../components/ui';
import{getWorkoApiErrorMessage}from'../../api/apiClient';
import{workerApi}from'../../worker/workerApi';
import type{WorkerProfile,WorkerRequirement}from'../../worker/types';
import{useAuthStore}from'../../store/authStore';
import{useTheme}from'../../theme/ThemeProvider';
import{WorkerOnboardingScreen}from'./WorkerOnboardingScreen';

const statusLabel=(s:WorkerProfile['status']):string=>({DRAFT:'Profile setup',PENDING_KYC:'KYC pending',KYC_SUBMITTED:'KYC submitted',UNDER_REVIEW:'Under review',VERIFIED:'Verified',REJECTED:'Changes required',SUSPENDED:'Suspended',BLOCKED:'Blocked'}[s]);
const schedule=(start:string,end:string):string=>{const a=new Date(start),b=new Date(end);if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return'Schedule unavailable';return `${a.toLocaleDateString(undefined,{day:'numeric',month:'short'})} • ${a.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})} – ${b.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`;};
const money=(v:string|number|null):string=>{if(v===null||v==='')return'Budget not specified';const n=Number(v);return Number.isFinite(n)?`₹${n.toLocaleString('en-IN')}`:'Budget not specified';};

export const WorkerHomeScreen=():React.JSX.Element=>{
 const user=useAuthStore(s=>s.user);const{theme}=useTheme();
 const[profile,setProfile]=useState<WorkerProfile|null>(null),[requirements,setRequirements]=useState<WorkerRequirement[]>([]);
 const[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[missing,setMissing]=useState(false),[error,setError]=useState<string|null>(null),[actionId,setActionId]=useState<string|null>(null);
 const load=useCallback(async()=>{setError(null);try{const[p,r]=await Promise.all([workerApi.getMyProfile(),workerApi.listRequirements()]);setProfile(p);setRequirements(r);setMissing(false);}catch(e){const m=getWorkoApiErrorMessage(e);if(m.toLowerCase().includes('not found')){setMissing(true);setProfile(null);setRequirements([]);}else setError(m);}},[]);
 const initial=useCallback(async()=>{setLoading(true);await load();setLoading(false);},[load]);
 const refresh=useCallback(async()=>{setRefreshing(true);await load();setRefreshing(false);},[load]);
 useEffect(()=>{void initial();},[initial]);
 const offers=useMemo(()=>requirements.filter(r=>r.assignment?.status==='OFFERED'),[requirements]);
 const active=useMemo(()=>requirements.filter(r=>r.assignment?.status==='ACCEPTED'&&r.status==='MATCHED'),[requirements]);
 const act=useCallback((r:WorkerRequirement,accept:boolean)=>{Alert.alert(accept?'Accept this work?':'Reject this offer?',accept?`You are accepting “${r.title}”.`:'You can reject it if the timing does not suit you.',[{text:'Cancel',style:'cancel'},{text:accept?'Accept':'Reject',style:accept?'default':'destructive',onPress:()=>void(async()=>{setActionId(r.id);try{if(accept)await workerApi.acceptRequirement(r.id);else await workerApi.rejectRequirement(r.id);await load();}catch(e){setError(getWorkoApiErrorMessage(e));}finally{setActionId(null);}})()}]);},[load]);
 if(loading)return<Screen><LoadingState message="Loading your worker workspace..." /></Screen>;
 if(missing)return<WorkerOnboardingScreen onComplete={p=>{setProfile(p);setMissing(false);void load();}}/>;
 if(!profile)return<Screen><ErrorState title="Could not load worker dashboard" description={error??'Worker profile unavailable'} onActionPress={()=>void initial()}/></Screen>;
 return <Screen padded={false}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh()} tintColor={theme.colors.accent}/>}>
  <AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>WORKER</AppText>
  <AppText variant="display">Hi, {user?.firstName??'there'} 👋</AppText>
  <AppText variant="body" muted>Stay ready for work that matches your skills.</AppText>
  {error?<AppCard><AppText variant="body" style={{color:theme.colors.danger}}>{error}</AppText></AppCard>:null}
  <AppCard elevated><AppText variant="caption" muted>PROFILE STATUS</AppText><AppText variant="title" style={styles.title}>{statusLabel(profile.status)}</AppText><AppText variant="body" muted>{profile.status==='VERIFIED'?'Your profile is verified and eligible to receive matched work.':'Complete the remaining onboarding requirements before KYC submission.'}</AppText></AppCard>
  <View style={styles.row}>{[[offers.length,'New offers'],[active.length,'Active jobs'],[profile.skills.length,'Skills']].map(([n,l])=><View key={String(l)} style={[styles.stat,{backgroundColor:theme.colors.surface,borderColor:theme.colors.border}]}><AppText variant="display">{n}</AppText><AppText variant="caption" muted>{l}</AppText></View>)}</View>
  <View style={styles.section}><AppText variant="title">Incoming work</AppText><AppText variant="caption" muted>{offers.length} pending</AppText></View>
  {offers.length===0?<AppCard><AppText variant="title">No new offers</AppText><AppText variant="body" muted style={styles.description}>Keep your availability on and your profile up to date. Matching work will appear here when a client requirement reaches you.</AppText></AppCard>:offers.map(r=><AppCard key={r.id} elevated><AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>{r.categoryName}{r.skillName?` • ${r.skillName}`:''}</AppText><AppText variant="title" style={styles.title}>{r.title}</AppText>{r.description?<AppText variant="body" muted style={styles.description}>{r.description}</AppText>:null}<View style={styles.details}><AppText variant="body">{schedule(r.scheduledStart,r.scheduledEnd)}</AppText><AppText variant="body" muted>{r.address}</AppText><AppText variant="body">{money(r.budget)}{r.assignment?.distanceKm!=null?` • ${Number(r.assignment.distanceKm).toFixed(1)} km away`:''}</AppText></View><View style={styles.actions}><View style={styles.button}><AppButton label="Reject" variant="outline" disabled={actionId===r.id} loading={actionId===r.id} onPress={()=>act(r,false)}/></View><View style={styles.button}><AppButton label="Accept work" disabled={actionId===r.id} loading={actionId===r.id} onPress={()=>act(r,true)}/></View></View></AppCard>)}
  <View style={styles.section}><AppText variant="title">Active work</AppText><AppText variant="caption" muted>{active.length} matched</AppText></View>
  {active.length===0?<AppCard><AppText variant="body" muted>No active job right now.</AppText></AppCard>:active.map(r=><AppCard key={r.id}><AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>{r.categoryName}</AppText><AppText variant="title" style={styles.title}>{r.title}</AppText><AppText variant="body" muted>{schedule(r.scheduledStart,r.scheduledEnd)}</AppText><AppText variant="body" muted style={styles.description}>{r.address}</AppText></AppCard>)}
  <AppCard><AppText variant="title">Availability</AppText><AppText variant="body" muted style={styles.description}>{profile.isAvailable?'You are available for new matching offers.':'You are currently unavailable for new matching offers.'}</AppText></AppCard>
 </ScrollView></Screen>;
};
const styles=StyleSheet.create({content:{padding:20,paddingBottom:32,gap:16},title:{marginTop:6},row:{flexDirection:'row',gap:10},stat:{flex:1,minHeight:92,borderWidth:1,borderRadius:16,padding:12,justifyContent:'space-between'},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4},description:{marginTop:8,lineHeight:21},details:{gap:6,marginTop:16},actions:{flexDirection:'row',gap:10,marginTop:18},button:{flex:1}});
