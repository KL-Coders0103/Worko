import React,{useCallback,useEffect,useState}from'react';
import{ScrollView,StyleSheet,View}from'react-native';
import{AppButton}from'../../components/ui/AppButton';
import{AppCard}from'../../components/ui/AppCard';
import{AppInput}from'../../components/ui/AppInput';
import{AppText}from'../../components/ui/AppText';
import{ErrorState}from'../../components/ui/ErrorState';
import{LoadingState}from'../../components/ui/LoadingState';
import{Screen}from'../../components/ui/Screen';
import{getWorkoApiErrorMessage}from'../../api/apiClient';
import{workerApi}from'../../worker/workerApi';
import type{WorkerCategory,WorkerProfile,WorkerSkill}from'../../worker/types';
import{useTheme}from'../../theme/ThemeProvider';
import{getCurrentLocation}from'../../location';

type Props={onComplete:(profile:WorkerProfile)=>void};

export const WorkerOnboardingScreen=({onComplete}:Props):React.JSX.Element=>{
 const{theme}=useTheme();
 const[profile,setProfile]=useState<WorkerProfile|null>(null);
 const[categories,setCategories]=useState<WorkerCategory[]>([]);
 const[skills,setSkills]=useState<WorkerSkill[]>([]);
 const[selectedCategories,setSelectedCategories]=useState<string[]>([]);
 const[selectedSkills,setSelectedSkills]=useState<string[]>([]);
 const[bio,setBio]=useState(''); const[experience,setExperience]=useState('');
 const[hourly,setHourly]=useState(''); const[daily,setDaily]=useState('');
 const[loading,setLoading]=useState(true); const[saving,setSaving]=useState(false); const[locating,setLocating]=useState(false); const[location,setLocation]=useState<{latitude:number;longitude:number;accuracyMeters?:number}|null>(null); const[error,setError]=useState<string|null>(null);

 const load=useCallback(async()=>{
  setLoading(true);setError(null);
  try{
   const cats=await workerApi.listCategories();setCategories(cats);
   try{
    const p=await workerApi.getMyProfile();setProfile(p);setBio(p.bio??'');setExperience(p.experienceYears?.toString()??'');setHourly(p.expectedHourlyRate?.toString()??'');setDaily(p.expectedDailyRate?.toString()??'');
    setSelectedCategories(p.categories.map(x=>x.categoryId));setSelectedSkills(p.skills.map(x=>x.skillId));
   }catch(err){
    if(!getWorkoApiErrorMessage(err).toLowerCase().includes('not found'))throw err;
   }
  }catch(err){setError(getWorkoApiErrorMessage(err));}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 useEffect(()=>{
  if(!selectedCategories.length){setSkills([]);setSelectedSkills([]);return;}
  let active=true;
  void Promise.all(selectedCategories.map(id=>workerApi.listSkills(id))).then(results=>{
   if(!active)return;const map=new Map<string,WorkerSkill>();results.flat().forEach(x=>map.set(x.id,x));setSkills([...map.values()]);setSelectedSkills(x=>x.filter(id=>map.has(id)));
  }).catch(err=>{if(active)setError(getWorkoApiErrorMessage(err));});
  return()=>{active=false;};
 },[selectedCategories]);

 const toggle=(id:string,setter:React.Dispatch<React.SetStateAction<string[]>>)=>setter(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const captureLocation=async()=>{setError(null);setLocating(true);try{const current=await getCurrentLocation();setLocation(current);}catch(err){setError(err instanceof Error?err.message:'Unable to get your current location.');}finally{setLocating(false);}};
 const save=async()=>{
  setError(null);
  const exp=experience.trim()?Number(experience):undefined;
  const h=hourly.trim()?Number(hourly):undefined; const d=daily.trim()?Number(daily):undefined;
  if(bio.trim().length<2)return setError('Add a short professional bio.');
  if(exp!==undefined&&(!Number.isInteger(exp)||exp<0||exp>60))return setError('Experience must be a whole number from 0 to 60.');
  if((h===undefined||!Number.isFinite(h)||h<0)&&(d===undefined||!Number.isFinite(d)||d<0))return setError('Add an hourly rate or a daily rate.');
  if(!selectedCategories.length)return setError('Select at least one category.');
  if(!selectedSkills.length)return setError('Select at least one skill.');
  if(!location)return setError('Capture your current location before saving your worker profile.');
  setSaving(true);
  try{
   const input={bio:bio.trim(),experienceYears:exp,expectedHourlyRate:h,expectedDailyRate:d,isAvailable:true};
   if(profile)await workerApi.updateProfile(input);else await workerApi.createProfile(input);
   await workerApi.updateCategories(selectedCategories);await workerApi.updateSkills(selectedSkills);
   if(!location)return setError('Capture your current location before saving your worker profile.');
   await workerApi.updateLocation(location);
   onComplete(await workerApi.getMyProfile());
  }catch(err){setError(getWorkoApiErrorMessage(err));}finally{setSaving(false);}
 };

 if(loading)return <Screen><LoadingState message="Preparing your worker profile..." /></Screen>;
 if(error&&!categories.length)return <Screen><ErrorState title="Could not load worker setup" description={error} onActionPress={()=>void load()}/></Screen>;

 return <Screen padded={false}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
  <AppText variant="caption" style={{color:theme.colors.accent,fontWeight:'800'}}>WORKER ONBOARDING</AppText>
  <AppText variant="display" style={styles.title}>Build your worker profile.</AppText>
  <AppText variant="body" muted>Tell Worko what you do so relevant requirements can be dispatched to you.</AppText>
  {error?<AppText variant="caption" style={{color:theme.colors.danger}}>{error}</AppText>:null}
  <AppCard><AppText variant="title">Professional details</AppText>
   <AppInput label="Bio" placeholder="Example: Experienced electrician" value={bio} onChangeText={setBio} multiline style={styles.bio}/>
   <AppInput label="Experience years" placeholder="0" value={experience} onChangeText={setExperience} keyboardType="number-pad"/>
   <AppInput label="Hourly rate (₹)" placeholder="Optional" value={hourly} onChangeText={setHourly} keyboardType="decimal-pad"/>
   <AppInput label="Daily rate (₹)" placeholder="Optional" value={daily} onChangeText={setDaily} keyboardType="decimal-pad"/>
  </AppCard>
  <AppCard><AppText variant="title">Categories</AppText><AppText variant="caption" muted style={styles.hint}>Choose the work you accept.</AppText>
   <View style={styles.chips}>{categories.map(x=><AppButton key={x.id} label={x.name} variant={selectedCategories.includes(x.id)?'primary':'outline'} onPress={()=>toggle(x.id,setSelectedCategories)}/>)}</View>
  </AppCard>
  {selectedCategories.length?<AppCard><AppText variant="title">Skills</AppText><AppText variant="caption" muted style={styles.hint}>Select skills for your categories.</AppText>
   <View style={styles.chips}>{skills.map(x=><AppButton key={x.id} label={x.name} variant={selectedSkills.includes(x.id)?'primary':'outline'} onPress={()=>toggle(x.id,setSelectedSkills)}/>)}</View>
  </AppCard>:null}
  <AppCard><AppText variant="title">Worker location</AppText><AppText variant="body" muted style={styles.next}>Your location helps Worko dispatch nearby requirements to you.</AppText>{location?<AppText variant="caption" style={{color:theme.colors.success,marginTop:10}}>Location captured • ±{Math.round(location.accuracyMeters??0)} m</AppText>:null}<AppButton label={location?'Refresh current location':'Use current location'} variant={location?'outline':'primary'} loading={locating} disabled={locating} onPress={()=>void captureLocation()}/></AppCard>
  <AppCard><AppText variant="title">Before KYC</AppText><AppText variant="body" muted style={styles.next}>A profile photo and worker location are required before KYC submission.</AppText></AppCard>
  <AppButton label="Save worker profile" loading={saving} disabled={saving} onPress={()=>void save()}/>
 </ScrollView></Screen>;
};

const styles=StyleSheet.create({content:{padding:20,paddingBottom:40,gap:16},title:{marginTop:6,marginBottom:4},bio:{minHeight:110,textAlignVertical:'top',paddingTop:14},hint:{marginTop:6,marginBottom:12},chips:{gap:10},next:{marginTop:8}});
