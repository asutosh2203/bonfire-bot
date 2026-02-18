'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiUser, FiCamera, FiX } from 'react-icons/fi';
import { useProfileStore } from '@/store/useProfileStore';
import { createBrowClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';

export default function EditProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const profile = useProfileStore((state) => state.userProfile);
  const setUserProfile = useProfileStore((state) => state.setUserProfile);
  const supabase = createBrowClient();

  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.about || '');

  // Debouncer states
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Avatar upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cropper states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (!username.trim() || username === profile?.username) {
      setIsAvailable(null);
      return;
    }

    // Username availability check
    const checkAvailability = async () => {
      setIsChecking(true);
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      setIsAvailable(!data);
      setIsChecking(false);
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [username, profile?.username, supabase]);

  if (!isOpen || !profile) return null;

  // Dynamic border color for the username field
  const getUsernameBorder = () => {
    if (username === profile.username)
      return 'border-[#2A2A2F] focus:border-[#FF6305]';
    if (isChecking) return 'border-[#3498DB]'; // Info (checking)
    if (isAvailable) return 'border-[#2ECC71]'; // Success
    if (isAvailable === false) return 'border-[#E74C3C]'; // Error
    return 'border-[#2A2A2F] focus:border-[#FF6305]';
  };

  // const handleImageUpload = async (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const originalFile = event.target.files?.[0];
  //   if (!originalFile || !profile) return;

  //   setIsUploading(true);

  //   try {
  //     // 1. Client-Side Compression
  //     // This turns a 5MB PNG into a tiny ~30KB WebP
  //     const compressedFile = await compressImage(originalFile);

  //     // 2. Safe Extension Handling
  //     // We ignore the filename and trust the MIME type
  //     const fileExt = compressedFile.type.split('/')[1]; // 'image/webp' -> 'webp'
  //     const filePath = `${profile.id}/avatar_${Date.now()}.${fileExt}`;

  //     // 3. Upload the optimized file
  //     const { error: uploadError } = await supabase.storage
  //       .from('avatars')
  //       .upload(filePath, compressedFile, { upsert: true });

  //     if (uploadError) throw uploadError;

  //     // 4. Get URL & Update Profile...
  //     const {
  //       data: { publicUrl },
  //     } = supabase.storage.from('avatars').getPublicUrl(filePath);

  //     // 5. Update the DB so it persists
  //     await supabase
  //       .from('profiles')
  //       .update({ avatar_url: publicUrl })
  //       .eq('id', profile.id);

  //     // 6. Instantly update Zustand so the UI (and WebSocket) catches it
  //     setUserProfile({ ...profile, avatar_url: publicUrl });
  //   } catch (error) {
  //     console.error('Upload failed:', error);
  //   } finally {
  //     setIsUploading(false);
  //     if (fileInputRef.current) fileInputRef.current.value = '';
  //   }
  // };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Create a fast, local URL for the cropper
      setImageSrc(URL.createObjectURL(file));
    }
  };

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels || !profile) return;

    setIsUploading(true);
    try {
      // 1. Let the canvas do the math and spit out a 720px WebP
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        'avatar.webp',
      );
      const filePath = `${profile.id}/avatar_${Date.now()}.webp`;

      // 2. Ship to Supabase Vault
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Grab URL & Update DB/Zustand
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);
      setUserProfile({ ...profile, avatar_url: publicUrl });

      // 4. Close the cropper UI
      setImageSrc(null);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const updates = {
        name,
        username,
        about: bio,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      setUserProfile({ ...profile, ...updates });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className='flex h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div className='flex w-64 flex-col bg-[#1A1A1E] p-4'>
          <h2 className='mb-4 px-3 text-xs font-bold uppercase tracking-wider text-[#7A7A80]'>
            User Settings
          </h2>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#26262C] text-[#F5F5F7]'
                : 'text-[#B3B3B8] hover:bg-[#202024] hover:text-[#F5F5F7]'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'bg-[#26262C] text-[#F5F5F7]'
                : 'text-[#B3B3B8] hover:bg-[#202024] hover:text-[#F5F5F7]'
            }`}
          >
            Appearance
          </button>
        </div>

        {/* Right Content Canvas */}
        <div className='relative flex flex-1 flex-col bg-[#121214]'>
          {/* Close Button */}
          <button
            onClick={onClose}
            className='absolute right-6 top-6 rounded-full p-2 text-[#7A7A80] hover:bg-[#202024] hover:text-[#F5F5F7] transition-colors'
          >
            <FiX size={24} />
          </button>
          {/* Hidden input for avatar upload */}
          <input
            type='file'
            accept='image/png, image/jpeg, image/webp'
            className='hidden'
            ref={fileInputRef}
            onChange={onFileChange}
          />
          {activeTab === 'profile' &&
            (!imageSrc ? (
              <div className='flex-1 overflow-y-auto p-10'>
                <h1 className='mb-8 text-2xl font-bold text-[#F5F5F7]'>
                  My Profile
                </h1>

                {/* Avatar Section */}
                <div className='mb-8 flex items-center gap-6'>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className='group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#202024]'
                  >
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt='Avatar'
                        className='h-full w-full object-cover'
                        width={96}
                        height={96}
                      />
                    ) : (
                      <FiUser size={40} className='text-[#7A7A80]' />
                    )}
                    {/* Hover Overlay */}
                    <div className='absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100'>
                      <FiCamera size={24} className='text-[#F5F5F7]' />
                    </div>
                  </div>
                  <div className='text-sm text-[#B3B3B8]'>
                    <p>We recommend an image of at least 256x256px.</p>
                    {/* <button className='mt-2 text-[#3498DB] hover:underline'>
                      Upload Image
                    </button> */}
                  </div>
                </div>

                {/* Form Fields */}
                <div className='max-w-md space-y-6'>
                  <div>
                    <label className='mb-2 block text-xs font-bold uppercase tracking-wider text-[#7A7A80]'>
                      Display Name
                    </label>
                    <input
                      type='text'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className='w-full rounded-md border border-[#2A2A2F] bg-[#1E1E22] p-3 text-sm text-[#F5F5F7] outline-none transition-colors focus:border-[#FF6305]'
                    />
                  </div>

                  <div>
                    <label className='mb-2 block text-xs font-bold uppercase tracking-wider text-[#7A7A80]'>
                      Username
                    </label>
                    <div className='relative'>
                      <input
                        type='text'
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full rounded-md border bg-[#1E1E22] p-3 text-sm text-[#F5F5F7] outline-none transition-colors ${getUsernameBorder()}`}
                      />
                      {isAvailable === false && (
                        <span className='absolute right-3 top-3 text-xs font-bold text-[#E74C3C]'>
                          Taken
                        </span>
                      )}
                      {isAvailable === true &&
                        username !== profile.username && (
                          <span className='absolute right-3 top-3 text-xs font-bold text-[#2ECC71]'>
                            Available
                          </span>
                        )}
                    </div>
                  </div>

                  <div>
                    <label className='mb-2 block text-xs font-bold uppercase tracking-wider text-[#7A7A80]'>
                      About Me
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What's your story?"
                      rows={4}
                      className='w-full resize-none rounded-md border border-[#2A2A2F] bg-[#1E1E22] p-3 text-sm text-[#F5F5F7] outline-none transition-colors focus:border-[#FF6305]'
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Crop view
              <div className='flex flex-1 flex-col bg-[#121214] p-10'>
                <h1 className='mb-6 text-2xl font-bold text-[#F5F5F7]'>
                  Adjust Avatar
                </h1>

                {/* Cropper Container */}
                <div className='relative flex-1 overflow-hidden rounded-lg bg-[#1A1A1E]'>
                  <Cropper
                    image={imageSrc || undefined}
                    crop={crop}
                    zoom={zoom}
                    aspect={1} // Locks it to a perfect square
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    onZoomChange={setZoom}
                    objectFit='contain'
                  />
                </div>

                {/* Zoom Slider*/}
                <div className='mt-6 flex items-center gap-4 px-4'>
                  <span className='text-sm font-bold text-[#7A7A80]'>Zoom</span>
                  <input
                    type='range'
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby='Zoom'
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className='h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-[#202024] accent-[#FF6305]'
                  />
                </div>

                {/* Cropper Action Footer */}
                <div className='mt-8 flex justify-end gap-3 border-t border-[#2A2A2F] pt-5'>
                  <button
                    onClick={() => setImageSrc(null)}
                    disabled={isUploading}
                    className='rounded-md px-5 py-2 text-sm font-medium text-[#F5F5F7] hover:underline'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadAvatar}
                    disabled={isUploading}
                    className='rounded-md bg-[#FF6305] px-5 py-2 text-sm font-bold text-[#F5F5F7] transition-colors hover:bg-[#FF7A2F] disabled:opacity-50'
                  >
                    {isUploading ? 'Uploading...' : 'Update Avatar'}
                  </button>
                </div>
              </div>
            ))}

          {/* Sticky Footer */}
          {!imageSrc && (
            <div className='border-t border-[#2A2A2F] bg-[#202024] p-5 flex justify-end gap-3'>
              <button
                onClick={onClose}
                className='rounded-md px-5 py-2 text-sm font-medium text-[#F5F5F7] hover:underline cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className='rounded-md bg-[#FF6305] px-5 py-2 text-sm font-bold text-[#F5F5F7] transition-colors hover:bg-[#FF7A2F] disabled:opacity-50 cursor-pointer'
                disabled={isAvailable === false || isChecking || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
