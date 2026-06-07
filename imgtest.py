import cv2
import os
path = 'ImagesAttendance'
myList = os.listdir(path)

for cl in myList:
    curImg = cv2.imread(f'{path}/{cl}')
    if curImg is not None:
        print(f"Image shape for {cl}: {curImg.shape}")
        if len(curImg.shape) == 3 and curImg.shape[2] == 3:
            print(f"{cl} is a valid RGB image.")
        else:
            print(f"{cl} is not a valid RGB image.")
